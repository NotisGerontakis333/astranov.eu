using System.Collections.Generic;
using UnityEngine;

// SLUMBER LAW (MASTER LAW §13e). Everything heavy MUST sleep when not
// actively needed. Sleepers register pairs of (sleep, wake) callbacks
// and the controller invokes them on app focus / idle transitions.
namespace Astranov {
public class SlumberController : MonoBehaviour {
  struct Sleeper { public string id; public System.Action sleep, wake; }
  static List<Sleeper> sleepers = new List<Sleeper>();
  static bool asleep = false;
  static float lastInputAt;
  const float IDLE_SECONDS = 5 * 60f;

  void Awake() { lastInputAt = Time.time; }

  public static void Register(string id, System.Action sleep, System.Action wake) {
    sleepers.Add(new Sleeper { id = id, sleep = sleep, wake = wake });
  }

  void OnApplicationFocus(bool focused) {
    if (focused) Wake(); else Sleep();
  }
  void OnApplicationPause(bool paused) {
    if (paused) Sleep(); else Wake();
  }

  void Update() {
    // Any pointer / touch / key resets the idle clock.
    if (Input.anyKey || Input.touchCount > 0 || Input.mousePresent && Input.GetMouseButton(0)) {
      if (asleep) Wake();
      lastInputAt = Time.time;
    }
    if (!asleep && Time.time - lastInputAt > IDLE_SECONDS) Sleep();
  }

  void Sleep() {
    if (asleep) return; asleep = true;
    foreach (var s in sleepers) { try { s.sleep?.Invoke(); } catch { } }
    QualitySettings.vSyncCount = 0;
    Application.targetFrameRate = 1;          // freeze the render thread
  }
  void Wake() {
    if (!asleep) return; asleep = false;
    Application.targetFrameRate = 60;
    QualitySettings.vSyncCount = 1;
    foreach (var s in sleepers) { try { s.wake?.Invoke(); } catch { } }
  }
}
}
