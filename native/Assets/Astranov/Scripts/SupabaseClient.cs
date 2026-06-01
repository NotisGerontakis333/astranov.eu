using System.Collections;
using System.Text;
using UnityEngine;
using UnityEngine.Networking;

// SupabaseClient — thin client for Astranov's Edge Functions. Same
// brain (aicycle, council, krypteia, informant-feed) as the web app.
// No service keys here. Anon key only — same security law.
namespace Astranov {
public class SupabaseClient : MonoBehaviour {
  public static SupabaseClient Instance { get; private set; }
  public string url;
  public string anonKey;
  public string accessToken;   // set after auth; if null, anon key is used

  void Awake() { Instance = this; }

  public IEnumerator InvokeFunction(string fn, string jsonBody, System.Action<string, string> onDone) {
    var endpoint = $"{url}/functions/v1/{fn}";
    using (var req = new UnityWebRequest(endpoint, "POST")) {
      var body = Encoding.UTF8.GetBytes(jsonBody ?? "{}");
      req.uploadHandler   = new UploadHandlerRaw(body);
      req.downloadHandler = new DownloadHandlerBuffer();
      req.SetRequestHeader("Content-Type", "application/json");
      req.SetRequestHeader("apikey", anonKey);
      req.SetRequestHeader("Authorization", "Bearer " + (string.IsNullOrEmpty(accessToken) ? anonKey : accessToken));
      yield return req.SendWebRequest();
      bool ok = req.result == UnityWebRequest.Result.Success;
      onDone?.Invoke(ok ? req.downloadHandler.text : null, ok ? null : req.error);
    }
  }

  public void AICycle(string prompt, System.Action<string> onReply) {
    var body = JsonUtility.ToJson(new AICycleRequest { prompt = prompt, mode = "spartan" });
    StartCoroutine(InvokeFunction("aicycle", body, (text, err) => {
      if (err != null || text == null) { onReply?.Invoke(null); return; }
      var resp = JsonUtility.FromJson<AICycleResponse>(text);
      onReply?.Invoke(resp != null ? resp.response : null);
    }));
  }

  [System.Serializable] class AICycleRequest  { public string prompt; public string mode; }
  [System.Serializable] class AICycleResponse { public string response; public string engine; public string routedBy; }
}
}
