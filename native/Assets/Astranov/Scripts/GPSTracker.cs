using UnityEngine;

// GPSTracker — native GPS via UnityEngine.Input.location. Implements the
// SLUMBER LAW: registers with SlumberController so the watch stops when
// the app is backgrounded or the user is idle for 5 min. Also implements
// the motion-aware camera (DRIVING / DRONE / SLUMBER) from the web app.
namespace Astranov {
public class GPSTracker : MonoBehaviour {
  public static GPSTracker Instance { get; private set; }

  public bool hasFix { get; private set; }
  public double latitude { get; private set; }
  public double longitude { get; private set; }
  public float  speedMps  { get; private set; }
  public float  headingDeg { get; private set; }

  enum DriveMode { Drone, Driving }
  DriveMode mode = DriveMode.Drone;
  double lastLat, lastLng;
  double lastFixTime;
  float[] speedBuf = new float[5];
  int speedBufIdx;
  float settledSince;
  float lastSwitchAt;
  bool running;

  void Awake() { Instance = this; }

  void Start() { RequestFix(); }

  public void RequestFix() {
    if (running) return;
    StartCoroutine(StartGPS());
  }

  System.Collections.IEnumerator StartGPS() {
    running = true;
    if (!Input.location.isEnabledByUser) {
      running = false;
      yield break;
    }
    Input.location.Start(1f, 1f);            // 1 m desired accuracy, 1 m update threshold
    Input.compass.enabled = true;
    int wait = 20;
    while (Input.location.status == LocationServiceStatus.Initializing && wait-- > 0)
      yield return new WaitForSeconds(1);
    if (Input.location.status != LocationServiceStatus.Running) {
      running = false;
      yield break;
    }
    SlumberController.Register("gps",
      sleep: () => { if (Input.location.status == LocationServiceStatus.Running) Input.location.Stop(); },
      wake:  () => { if (Input.location.status != LocationServiceStatus.Running) Input.location.Start(1f, 1f); });
  }

  void Update() {
    if (Input.location.status != LocationServiceStatus.Running) return;
    var d = Input.location.lastData;
    double now = Time.realtimeSinceStartupAsDouble;
    if (d.timestamp == lastFixTime) return;
    lastFixTime = d.timestamp;

    double prevLat = hasFix ? latitude : d.latitude;
    double prevLng = hasFix ? longitude : d.longitude;
    latitude = d.latitude; longitude = d.longitude; hasFix = true;
    headingDeg = Input.compass.enabled ? Input.compass.trueHeading : 0;

    // Real speed: Unity gives us nothing trustworthy, compute from delta.
    float sp = 0;
    if (now - settledSince > 0 && (latitude != prevLat || longitude != prevLng)) {
      float meters = Haversine(prevLat, prevLng, latitude, longitude);
      float dt = Mathf.Max(0.1f, (float)(now - lastFixTime + Time.deltaTime));
      sp = meters / dt;
      if (sp < 0.4f) sp = 0;
    }
    speedBuf[speedBufIdx] = sp; speedBufIdx = (speedBufIdx + 1) % speedBuf.Length;
    float avg = 0; foreach (var v in speedBuf) avg += v; avg /= speedBuf.Length;
    speedMps = avg;

    float dwell = Time.time - lastSwitchAt;
    if (mode == DriveMode.Drone && avg > 2.5f && dwell > 1.5f) {
      mode = DriveMode.Driving; lastSwitchAt = Time.time; settledSince = 0;
      Navigation.Instance?.DiveToMe();
    } else if (mode == DriveMode.Driving) {
      if (avg < 0.6f) {
        if (settledSince == 0) settledSince = Time.time;
        if (Time.time - settledSince > 6f && dwell > 2f) {
          mode = DriveMode.Drone; lastSwitchAt = Time.time;
        }
      } else settledSince = 0;
    }
  }

  static float Haversine(double aLat, double aLng, double bLat, double bLng) {
    const double R = 6371000;
    double toR = System.Math.PI / 180.0;
    double dLat = (bLat - aLat) * toR;
    double dLng = (bLng - aLng) * toR;
    double s = System.Math.Sin(dLat / 2) * System.Math.Sin(dLat / 2)
             + System.Math.Cos(aLat * toR) * System.Math.Cos(bLat * toR)
             * System.Math.Sin(dLng / 2) * System.Math.Sin(dLng / 2);
    return (float)(2 * R * System.Math.Asin(System.Math.Sqrt(s)));
  }
}
}
