using UnityEngine;
using CesiumForUnity;
using Unity.Mathematics;

// Navigation — GLOBAL → NATIONAL → PERSONAL.
// One camera, three altitude bands. DIVE-TO-ME (one tap, mandatory):
// from any tier the user collapses the three-step descent into a single
// gesture by tapping their own beacon. The camera lerps to PERSONAL
// over the user's fix in the same call. This is load-bearing per the
// MASTER LAW §5.
namespace Astranov {
public enum Tier { Global, National, Personal }

public class Navigation : MonoBehaviour {
  public static Navigation Instance { get; private set; }

  const double GLOBAL_THRESHOLD   = 5_000_000.0;
  const double NATIONAL_THRESHOLD =   500_000.0;
  const double PERSONAL_ALTITUDE  =     1_200.0;

  CesiumGeoreference georef;
  CesiumGlobeAnchor cameraAnchor;
  Transform cameraTr;
  public Tier currentTier { get; private set; } = Tier.Global;

  void Awake() { Instance = this; }

  public void Bind(CesiumGeoreference g, CesiumGlobeAnchor a, Transform t) {
    georef = g; cameraAnchor = a; cameraTr = t;
  }

  public Tier DeriveTier(double height) {
    if (height > GLOBAL_THRESHOLD)   return Tier.Global;
    if (height > NATIONAL_THRESHOLD) return Tier.National;
    return Tier.Personal;
  }

  // DIVE-TO-ME — one-tap descent from anywhere to PERSONAL.
  public void DiveToMe() {
    if (!GPSTracker.Instance || !GPSTracker.Instance.hasFix) {
      GPSTracker.Instance?.RequestFix();
      return;
    }
    var lat = GPSTracker.Instance.latitude;
    var lng = GPSTracker.Instance.longitude;
    StartCoroutine(FlyTo(lng, lat, PERSONAL_ALTITUDE, pitchDeg: 65f, seconds: 1.4f));
    // Warm nearby vendors in the same call — "what I can do around me"
    // is alive the moment the camera lands.
    Vendors.Instance?.FetchNearby(lat, lng, radiusMeters: 1500);
  }

  // Single tap on empty globe — descend one tier toward the tapped point.
  public void TapDescend(double targetLng, double targetLat) {
    double h = cameraAnchor.longitudeLatitudeHeight.z;
    double target;
    float pitch = 90f;
    if (h > GLOBAL_THRESHOLD)        target = 700_000;
    else if (h > NATIONAL_THRESHOLD) target =   8_000;
    else                            { target =   1_200; pitch = 65f; }
    StartCoroutine(FlyTo(targetLng, targetLat, target, pitch, 1.6f));
  }

  System.Collections.IEnumerator FlyTo(double lng, double lat, double altMeters, float pitchDeg, float seconds) {
    var from = cameraAnchor.longitudeLatitudeHeight;
    var to   = new double3(lng, lat, altMeters);
    var fromRot = cameraTr.localRotation;
    var toRot   = Quaternion.Euler(pitchDeg, 0, 0);
    float t = 0;
    while (t < seconds) {
      t += Time.deltaTime;
      float u = Mathf.SmoothStep(0, 1, Mathf.Clamp01(t / seconds));
      var pos = new double3(
        math.lerp(from.x, to.x, u),
        math.lerp(from.y, to.y, u),
        math.lerp(from.z, to.z, u));
      cameraAnchor.longitudeLatitudeHeight = pos;
      cameraTr.localRotation = Quaternion.Slerp(fromRot, toRot, u);
      yield return null;
    }
    cameraAnchor.longitudeLatitudeHeight = to;
    cameraTr.localRotation = toRot;
    currentTier = DeriveTier(altMeters);
  }
}
}
