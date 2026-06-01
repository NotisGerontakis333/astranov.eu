using UnityEngine;
using CesiumForUnity;

// TapToDescend — single-tap on empty globe descends one tier toward
// the tap point. Tap the user beacon → DIVE-TO-ME. Tap a vendor pin →
// open the place panel. Same gesture grammar as the web app.
namespace Astranov {
public class TapToDescend : MonoBehaviour {
  Camera cam;
  void Start() { cam = Camera.main; }

  void Update() {
    if (cam == null) return;
    bool tapped = false;
    Vector2 pos = Vector2.zero;
    if (Input.touchCount == 1 && Input.GetTouch(0).phase == TouchPhase.Ended) {
      tapped = true; pos = Input.GetTouch(0).position;
    } else if (Input.GetMouseButtonUp(0)) {
      tapped = true; pos = Input.mousePosition;
    }
    if (!tapped) return;

    var ray = cam.ScreenPointToRay(pos);
    if (!Physics.Raycast(ray, out var hit, 1e8f)) {
      // No hit — try unprojecting through Cesium's ground.
      DescendGeneric(ray);
      return;
    }
    if (hit.collider.GetComponentInParent<UserBeacon>() != null) {
      Navigation.Instance?.DiveToMe();
      return;
    }
    var anchor = hit.collider.GetComponentInParent<CesiumGlobeAnchor>();
    if (anchor != null) {
      var ll = anchor.longitudeLatitudeHeight;
      Navigation.Instance?.TapDescend(ll.x, ll.y);
    }
  }

  void DescendGeneric(Ray ray) {
    // Without a collider hit we still descend over the current centre.
    if (GPSTracker.Instance && GPSTracker.Instance.hasFix) {
      Navigation.Instance?.TapDescend(GPSTracker.Instance.longitude, GPSTracker.Instance.latitude);
    }
  }
}

// Marker component on the user's beacon prefab so the raycast knows
// "this hit was the user, dive."
public class UserBeacon : MonoBehaviour { }
}
