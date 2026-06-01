using System.Collections;
using UnityEngine;
using UnityEngine.Networking;
using CesiumForUnity;

// Vendors — fetches nearby places from Overpass and drops native
// billboard pins on the globe. PERSONAL tier only (hidden at GLOBAL
// and NATIONAL — orbs do the job at those altitudes).
namespace Astranov {
public class Vendors : MonoBehaviour {
  public static Vendors Instance { get; private set; }

  [Header("Pin prefab — set up a Quad with a glow material")]
  public GameObject pinPrefab;

  CesiumGeoreference georef;
  Transform pinRoot;

  void Awake() {
    Instance = this;
    var go = new GameObject("VendorPins");
    pinRoot = go.transform;
  }

  public void Bind(CesiumGeoreference g) {
    georef = g;
    pinRoot.SetParent(g.transform, false);
  }

  public void FetchNearby(double lat, double lng, int radiusMeters) {
    StartCoroutine(Fetch(lat, lng, radiusMeters));
  }

  IEnumerator Fetch(double lat, double lng, int radiusMeters) {
    string q = $@"[out:json][timeout:10];(
      node[""amenity""~""restaurant|cafe|bar|fast_food|pub""](around:{radiusMeters},{lat},{lng});
      node[""shop""](around:{radiusMeters},{lat},{lng});
      node[""tourism""](around:{radiusMeters},{lat},{lng});
    );out body 80;";
    using (var req = UnityWebRequest.Post("https://overpass-api.de/api/interpreter", q)) {
      req.SetRequestHeader("Content-Type", "text/plain");
      yield return req.SendWebRequest();
      if (req.result != UnityWebRequest.Result.Success) yield break;
      RenderPins(req.downloadHandler.text);
    }
  }

  void RenderPins(string osmJson) {
    // Clear previous pins
    for (int i = pinRoot.childCount - 1; i >= 0; i--) Destroy(pinRoot.GetChild(i).gameObject);
    // Parse Overpass — minimal extraction; for a real run, use a
    // small JSON parser. Unity's JsonUtility doesn't handle the
    // open Overpass shape directly. We rely on the Edge Function
    // wrapper /nearby for clean JSON in a follow-up commit.
    if (pinPrefab == null || georef == null) return;
    var pins = SimpleOverpass.ParsePoints(osmJson);
    foreach (var p in pins) {
      var go = Instantiate(pinPrefab, pinRoot);
      go.name = p.name ?? "place";
      var anchor = go.AddComponent<CesiumGlobeAnchor>();
      anchor.longitudeLatitudeHeight = new Unity.Mathematics.double3(p.lng, p.lat, 0);
    }
  }
}

// Minimal Overpass extractor — pull out (lat, lon, tags.name) from the
// flat element array. Avoids dragging Newtonsoft into the project.
public static class SimpleOverpass {
  public struct Point { public double lat, lng; public string name; }
  public static System.Collections.Generic.List<Point> ParsePoints(string json) {
    var list = new System.Collections.Generic.List<Point>();
    int idx = 0;
    while (true) {
      int latI = json.IndexOf("\"lat\":", idx); if (latI < 0) break;
      int lonI = json.IndexOf("\"lon\":", latI); if (lonI < 0) break;
      double lat = ReadDouble(json, latI + 6);
      double lng = ReadDouble(json, lonI + 6);
      int nameI = json.IndexOf("\"name\":\"", lonI);
      string name = null;
      int blockEnd = json.IndexOf('}', lonI);
      if (nameI > 0 && nameI < blockEnd) {
        int end = json.IndexOf('"', nameI + 8);
        if (end > nameI) name = json.Substring(nameI + 8, end - nameI - 8);
      }
      list.Add(new Point { lat = lat, lng = lng, name = name });
      idx = blockEnd + 1;
    }
    return list;
  }
  static double ReadDouble(string s, int start) {
    int end = start;
    while (end < s.Length && (char.IsDigit(s[end]) || s[end] == '-' || s[end] == '.' || s[end] == 'e' || s[end] == 'E' || s[end] == '+')) end++;
    double.TryParse(s.Substring(start, end - start), System.Globalization.NumberStyles.Float,
      System.Globalization.CultureInfo.InvariantCulture, out double v);
    return v;
  }
}
}
