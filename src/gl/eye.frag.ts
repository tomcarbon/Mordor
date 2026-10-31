// Fire-Eye: a globe of striated iris with a vertical slit, set in cracked, burning crust.
// All colour comes from the palette uniforms, which are read from tokens.css.
export const EYE_VERTEX = /* glsl */ `
attribute vec2 aPosition;
void main() { gl_Position = vec4(aPosition, 0.0, 1.0); }
`;

export const EYE_FRAGMENT = /* glsl */ `
precision highp float;

uniform vec2 uCenter;
uniform float uScale;
uniform float uTime;
uniform vec2 uGaze;
uniform float uAttention;
uniform float uRing;
uniform vec3 uIron, uWax, uEmber, uEye, uHeat;

const float PI = 3.14159265;

vec3 hash3(vec3 p) {
  p = fract(p * vec3(0.1031, 0.1030, 0.0973));
  p += dot(p, p.yxz + 33.33);
  return -1.0 + 2.0 * fract((p.xxy + p.yxx) * p.zyx);
}

float noise(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  vec3 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  return mix(
    mix(mix(dot(hash3(i), f), dot(hash3(i + vec3(1, 0, 0)), f - vec3(1, 0, 0)), u.x),
        mix(dot(hash3(i + vec3(0, 1, 0)), f - vec3(0, 1, 0)), dot(hash3(i + vec3(1, 1, 0)), f - vec3(1, 1, 0)), u.x), u.y),
    mix(mix(dot(hash3(i + vec3(0, 0, 1)), f - vec3(0, 0, 1)), dot(hash3(i + vec3(1, 0, 1)), f - vec3(1, 0, 1)), u.x),
        mix(dot(hash3(i + vec3(0, 1, 1)), f - vec3(0, 1, 1)), dot(hash3(i + vec3(1, 1, 1)), f - vec3(1, 1, 1)), u.x), u.y),
    u.z);
}

float fbm3(vec3 p) {
  return noise(p) * 0.55 + noise(p * 2.03 + 11.1) * 0.28 + noise(p * 4.1 + 23.7) * 0.14;
}

float fbm5(vec3 p) {
  float sum = 0.0, amp = 0.52;
  for (int i = 0; i < 5; i++) {
    sum += noise(p) * amp;
    p = p.yzx * 2.04 + vec3(13.7, 7.1, 3.3);
    amp *= 0.52;
  }
  return sum;
}

// Iron to wax to ember to the Eye's own colour, then heat.
vec3 ramp(float h) {
  h = clamp(h, 0.0, 1.2);
  vec3 c = mix(uIron, uWax, smoothstep(0.02, 0.28, h));
  c = mix(c, uEmber, smoothstep(0.22, 0.48, h));
  c = mix(c, uEye, smoothstep(0.42, 0.72, h));
  c = mix(c, uHeat, smoothstep(0.72, 1.05, h));
  return c;
}

// Double domain warp: each noise field displaces the next.
float warped(vec2 p, float t, out vec2 warp) {
  vec3 a = vec3(p, t * 0.5);
  vec2 q = vec2(fbm3(a + vec3(0.0, 0.0, 0.0)), fbm3(a + vec3(5.2, 1.3, 2.1)));
  vec3 b = vec3(p + 1.8 * q, t * 0.7);
  vec2 r = vec2(fbm3(b + vec3(1.7, 9.2, 0.4)), fbm3(b + vec3(8.3, 2.8, 1.1)));
  warp = r;
  return fbm5(vec3(p + 1.7 * r, t));
}

// Distance to the nearest plate seam of a cracked crust (cellular noise, F2 - F1).
float seams(vec2 x, float t, out float plate) {
  vec2 n = floor(x), f = fract(x);
  float f1 = 8.0, f2 = 8.0;
  plate = 0.0;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 g = vec2(float(i), float(j));
      vec3 h = hash3(vec3(n + g, 3.7));
      vec2 r = g + 0.5 + 0.42 * sin(h.xy * 3.1 + t * h.z * 0.04) - f;
      float d = dot(r, r);
      if (d < f1) {
        f2 = f1;
        f1 = d;
        plate = h.z;
      } else if (d < f2) {
        f2 = d;
      }
    }
  }
  return sqrt(f2) - sqrt(f1);
}

vec3 burningField(vec2 p, float lid, float t, float reach) {
  float near = exp(-max(lid, 0.0) * mix(4.3, 1.6, reach));
  float below = smoothstep(-0.5, -2.1, p.y);
  if (near < 0.012 && below < 0.01) return ramp(0.02); // cold crust: skip the expensive part

  vec3 a = vec3(p * 0.9, t * 0.02);
  vec2 warp = vec2(fbm3(a), fbm3(a + vec3(5.2, 1.3, 2.1)));
  vec2 q = p * vec2(0.95, 1.5) + warp * 1.5;

  float plate, hairPlate;
  float wide = seams(q * 1.9, t, plate);
  float hair = seams(q * 5.1 + 3.0, t, hairPlate);
  float breath = 0.9 + 0.1 * sin(t * 0.4 + plate * 6.0);

  float seam = 1.0 - smoothstep(0.0, 0.05 + 0.03 * reach, wide);
  float bleed = exp(-wide * 7.5);
  float thread = (1.0 - smoothstep(0.0, 0.07, hair)) * smoothstep(0.32, 0.0, wide);

  float heat = 0.03 + 0.09 * near * (0.4 + plate * 0.6 + plate * plate);
  heat += seam * (near * 1.05 + below * 0.12) * breath;
  heat += bleed * near * 0.3;
  heat += thread * near * near * 0.42;
  return ramp(heat);
}

vec3 eyeball(vec2 p, float t, float attention) {
  vec2 b = p / 1.28;
  float z = sqrt(max(1.0 - dot(b, b), 0.0));
  vec3 n = vec3(b, z);

  // The globe turns under the lids; that is what gives the gaze its weight.
  float yaw = uGaze.x * 0.62, pitch = uGaze.y * 0.42;
  float cy = cos(yaw), sy = sin(yaw), cp = cos(pitch), sp = sin(pitch);
  n = vec3(cy * n.x - sy * n.z, n.y, sy * n.x + cy * n.z);
  n = vec3(n.x, cp * n.y - sp * n.z, sp * n.y + cp * n.z);

  float angle = acos(clamp(n.z, -1.0, 1.0)) / (PI * 0.5);
  vec2 dir = normalize(n.xy + 1e-5);
  vec2 q = dir * angle;
  float r = angle / 0.38;

  float flow = t * 0.11;
  float twist = 0.26 * fbm3(vec3(q * 5.0, flow * 0.6));
  vec2 d = vec2(dir.x * cos(twist) - dir.y * sin(twist), dir.x * sin(twist) + dir.y * cos(twist));

  // Striations: long radial fibres, three scales, seamless because they sample the circle.
  float broad = fbm3(vec3(d * 3.4, r * 0.9 - flow));
  float mid = noise(vec3(d * 15.0, r * 1.5 - flow * 1.4));
  float thin = noise(vec3(d * 38.0, r * 1.6 - flow * 1.8));
  float fibres = 0.5 + 1.15 * broad + 0.85 * mid + 0.42 * thin;
  fibres = smoothstep(0.08, 1.02, fibres);

  float collar = exp(-pow((r - 0.46 - 0.1 * broad) / 0.09, 2.0));
  float core = pow(max(1.0 - r, 0.0), 1.05);
  float heat = (core * 1.3 + 0.22 + collar * 0.32) * mix(0.34, 1.2, fibres);
  heat *= 0.9 + 0.2 * attention;

  // Outside the iris: slow plasma, cooling towards the corners.
  vec2 w;
  float plasma = warped(q * 5.0 + vec2(0.0, -t * 0.015), t * 0.07, w);
  float cooler = 0.2 + 0.32 * smoothstep(-0.32, 0.4, plasma + w.y);
  float limbus = smoothstep(0.92, 1.08, r);
  heat = mix(heat, cooler * (1.0 - 0.45 * smoothstep(1.0, 2.1, r)), limbus);
  heat *= 1.0 - 0.72 * exp(-pow((r - 1.02) / 0.085, 2.0)); // the dark ring that seats the iris

  vec3 color = ramp(heat);

  float width = mix(0.05, 0.026, attention) * mix(1.0, 1.5, uRing);
  float height = 0.3;
  float taper = pow(max(1.0 - pow(abs(q.y) / height, 2.0), 0.0), 0.8);
  float edge = abs(q.x + 0.0025 * noise(vec3(q * 40.0, flow))) - width * taper;
  float pupil = 1.0 - smoothstep(-0.004, 0.004, edge);
  float blaze = exp(-max(edge, 0.0) * 62.0) * step(abs(q.y), height + 0.02);
  color = mix(color, uHeat, blaze * 0.85 * smoothstep(height + 0.015, height - 0.1, abs(q.y)));
  float depth = exp(-pow(q.x / max(width * taper, 0.001), 2.0) * 1.4);
  color = mix(color, mix(uIron * 0.2, uWax * 0.5, 0.25 * (1.0 - depth)), pupil);

  return color * (0.5 + 0.5 * pow(z, 0.5));
}

void main() {
  vec2 p = (gl_FragCoord.xy - uCenter) / uScale;
  float t = uTime;
  float attention = uAttention;
  float reach = max(attention, uRing * 0.4);

  // The lids are an almond with a noisy, burning edge. They lift as attention grows.
  float lift = mix(0.64, 0.94, attention) + 0.012 * sin(t * 0.31);
  float span = 2.05;
  vec2 lp = p + 0.05 * vec2(noise(vec3(p * 2.6, t * 0.05)), noise(vec3(p * 2.6 + 7.0, t * 0.05)));
  float along = clamp(abs(lp.x) / span, 0.0, 1.0);
  float opening = lift * pow(1.0 - along * along, 1.45);
  float lid = abs(lp.y) - opening;

  vec3 field = burningField(p, lid, t, reach);
  float luma = dot(field, vec3(0.3, 0.55, 0.15));
  vec3 cold = luma * vec3(0.9, 1.08, 1.2) + uIron * 0.6;
  field = mix(field, cold, uRing);

  vec3 color = field;
  if (lid < 0.04) {
    vec3 eye = eyeball(p, t, attention);
    eye *= 0.42 + 0.58 * smoothstep(0.0, 0.3, -lid);
    color = mix(eye, field, smoothstep(-0.008, 0.008, lid));
  }

  float rimNoise = 0.6 + 1.3 * noise(vec3(p * 5.0, t * 0.09));
  float rim = exp(-abs(lid) * 26.0) * rimNoise;
  color = mix(color, mix(uEmber, uEye, rimNoise * 0.6), clamp(rim, 0.0, 1.0) * 0.9);

  float edgeFade = smoothstep(2.9, 0.8, length(p * vec2(0.68, 1.0)));
  color = mix(uIron * mix(1.0, 1.6, uRing), color, edgeFade);

  color += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 160.0;
  gl_FragColor = vec4(color, 1.0);
}
`;
