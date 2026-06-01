using UnityEngine;
using CesiumForUnity;

// AstranoV — native boot.
// Builds the Cesium globe at runtime, drops the camera at GLOBAL tier,
// kicks GPS + Supabase + the slumber controller. One scene, one camera,
// three altitude bands (GLOBAL > 5,000 km, NATIONAL 500–5,000 km,
// PERSONAL < 500 km) — same law as the web version.
namespace Astranov {
public class AstranovBoot : MonoBehaviour {
  [Header("Cesium ion")]
  [Tooltip("Your Cesium ion access token. Get one at https://ion.cesium.com/tokens")]
  public string ionAccessToken = "";

  [Header("Supabase")]
  public string supabaseUrl = "https://lkoatrkhuigdolnjsbie.supabase.co";
  public string supabaseAnonKey = "";

  // Asset IDs from Cesium ion:
  //   1       — Cesium World Terrain (real bathymetry + topography)
  //   2       — Bing Maps Aerial (day imagery)
  //   3       — Bing Maps Aerial with Labels
  //   3812    — Earth at Night (Black Marble) overlay
  public long terrainAssetId = 1;
  public long imageryAssetId = 2;

  // Global tier starting altitude — match the web app (~12,000 km).
  public double startAltitudeMeters = 12_000_000.0;
  public double startLatitude = 35.0;
  public double startLongitude = 20.0;

  CesiumGeoreference georeference;
  Cesium3DTileset terrain;
  GameObject globeRoot;

  void Awake() {
    BuildGlobe();
    BuildCamera();
    AttachSystems();
  }

  void BuildGlobe() {
    globeRoot = new GameObject("AstranovGlobe");
    georeference = globeRoot.AddComponent<CesiumGeoreference>();
    georeference.longitude = startLongitude;
    georeference.latitude = startLatitude;
    georeference.height = 0;

    var terrainGO = new GameObject("CesiumWorldTerrain");
    terrainGO.transform.SetParent(globeRoot.transform, false);
    terrain = terrainGO.AddComponent<Cesium3DTileset>();
    terrain.ionAccessToken = ionAccessToken;
    terrain.ionAssetID = terrainAssetId;

    var rasterGO = new GameObject("BingAerial");
    rasterGO.transform.SetParent(terrainGO.transform, false);
    var raster = rasterGO.AddComponent<CesiumIonRasterOverlay>();
    raster.ionAccessToken = ionAccessToken;
    raster.ionAssetID = imageryAssetId;
  }

  void BuildCamera() {
    var rig = new GameObject("CameraRig");
    rig.transform.SetParent(georeference.transform, false);
    var anchor = rig.AddComponent<CesiumGlobeAnchor>();
    anchor.longitudeLatitudeHeight = new Unity.Mathematics.double3(
      startLongitude, startLatitude, startAltitudeMeters);

    var camGO = new GameObject("MainCamera");
    camGO.transform.SetParent(rig.transform, false);
    var cam = camGO.AddComponent<Camera>();
    cam.tag = "MainCamera";
    cam.farClipPlane = 1e8f;
    cam.nearClipPlane = 1f;
    camGO.AddComponent<AudioListener>();
    // Point the camera straight down at the surface (drone pitch).
    camGO.transform.localRotation = Quaternion.Euler(90, 0, 0);

    Navigation.Instance.Bind(georeference, anchor, camGO.transform);
  }

  void AttachSystems() {
    gameObject.AddComponent<GPSTracker>();
    gameObject.AddComponent<SlumberController>();
    var sb = gameObject.AddComponent<SupabaseClient>();
    sb.url = supabaseUrl;
    sb.anonKey = supabaseAnonKey;
  }
}
}
