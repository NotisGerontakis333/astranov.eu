using UnityEngine;
using UnityEngine.UI;
using TMPro;

// Wordmark — the always-visible "ASTRANOV" name. Pure inscriptional
// capitals glowing deep Greek navy out of the void. BANNED by law:
// any background fill, border, backdrop blur, rounded badge,
// box-shadow halo, orange or gold trim, or anything that makes the
// name look like a button. The glow is the only chrome.
namespace Astranov {
[RequireComponent(typeof(Canvas))]
public class Wordmark : MonoBehaviour {
  TextMeshProUGUI label;
  float t;

  void Start() {
    var canvas = GetComponent<Canvas>();
    canvas.renderMode = RenderMode.ScreenSpaceOverlay;
    canvas.sortingOrder = 1000;

    var go = new GameObject("ASTRANOV");
    go.transform.SetParent(transform, false);
    label = go.AddComponent<TextMeshProUGUI>();
    label.text = "ASTRANOV";
    label.fontSize = 38;
    label.alignment = TextAlignmentOptions.Center;
    label.characterSpacing = 24;
    label.fontStyle = FontStyles.Bold;
    label.color = new Color(0.812f, 0.886f, 1.0f, 1f);   // #cfe2ff
    label.outlineWidth = 0.2f;
    label.outlineColor = new Color(0.176f, 0.424f, 0.769f, 1f); // #2d6cc4

    var rect = label.rectTransform;
    rect.anchorMin = new Vector2(0.5f, 1f);
    rect.anchorMax = new Vector2(0.5f, 1f);
    rect.pivot     = new Vector2(0.5f, 1f);
    rect.anchoredPosition = new Vector2(0, -28);
    rect.sizeDelta = new Vector2(640, 60);

    label.fontMaterial.EnableKeyword("GLOW_ON");
    label.fontMaterial.SetColor("_GlowColor", new Color(0.078f, 0.204f, 0.470f, 1f)); // #143478
    label.fontMaterial.SetFloat("_GlowOuter", 0.4f);
    label.fontMaterial.SetFloat("_GlowPower", 0.6f);
  }

  void Update() {
    if (label == null) return;
    t += Time.deltaTime * 0.7f;
    float u = 0.5f + 0.5f * Mathf.Sin(t);
    label.fontMaterial.SetFloat("_GlowPower", 0.45f + 0.25f * u);
    label.fontMaterial.SetFloat("_GlowOuter", 0.32f + 0.16f * u);
  }
}
}
