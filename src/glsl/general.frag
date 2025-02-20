#ifdef GL_OES_standard_derivatives
#extension GL_OES_standard_derivatives : enable
#endif

precision mediump float;

varying vec4 fill;
varying vec2 letter_pos;
varying float point_size;
varying float paper_id;
varying float filter_gray_out;

uniform float u_only_color;
uniform float u_color_picker_mode;
const int MAX_PAPER_IDS = 256;
uniform float u_paper_ids_size;
uniform sampler2D u_paper_ids_texture;

//uniform float u_use_glyphset;
//uniform sampler2D u_glyphset;
float delta = 0.0, alpha = 1.0;

bool out_of_circle(in vec2 coord) {
  vec2 cxy = 2.0 * coord - 1.0;
  float r_sq = dot(cxy, cxy);
  if (r_sq > 1.03) {return true;}
  return false;
}

bool out_of_hollow_circle(in vec2 coord) {
  vec2 cxy = 2.0 * coord - 1.0;
  float r_sq = dot(cxy, cxy);
  if (r_sq > 1.01) {return true;}
  float distance_from_edge = (1.0 - r_sq) * point_size;
  if (distance_from_edge > 4.0) {return true;}
  return false;
}

bool out_of_triangle(in vec2 coord) {
  if (coord.y > (2. * abs(coord.x - .5))) {
    return false;
  }
  return true;
}

void main() {
  if (u_only_color >= -1.5) {
    gl_FragColor = vec4(0., 0., 0., 1./255.);
    return;
  }

  float alpha = fill.a;
  
  // Check for points in paper_ids list first
  bool is_paper_id_in_list = false;
  for (int i = 0; i < MAX_PAPER_IDS; i++) {
    if (float(i) >= u_paper_ids_size)
      break;
      
    float stored_id = texture2D(u_paper_ids_texture, vec2((float(i) + 0.5) / float(MAX_PAPER_IDS), 0.5)).r;
    
    if (abs(stored_id - paper_id) < 0.01) {
      is_paper_id_in_list = true;
      break;
    }
  }
  
  // Standard circle discard logic
  vec2 cxy = 2.0 * gl_PointCoord - 1.0;
  float r_sq = dot(cxy, cxy);
  
  if (r_sq > 1.03) {
    discard;
    return;
  }
  
  #ifdef GL_OES_standard_derivatives
    delta = fwidth(r_sq);  // Fixed: using r_sq instead of r
    alpha *= (1.0 - smoothstep(1.0 - delta, 1.0 + delta, r_sq));
  #endif

  // Set the base color
  vec4 finalColor = fill;
  
  if (u_color_picker_mode >= 1.) {
    // For color picking mode, don't modify anything
    gl_FragColor = fill;
  } else {
    // For normal rendering mode
    if (is_paper_id_in_list) {
      // Make highlighted points fully opaque
      alpha = 1.0;
      if (filter_gray_out > 0.5) {
        // Apply gray color (#CCCCCC)
        finalColor.rgb = vec3(0.6, 0.6, 0.6);
        // Reduce alpha slightly for filtered points
        alpha *= 0.7;
      }

      // Create a border effect for highlighted points
      // Border width - adjust this value to make border thicker or thinner
      float borderWidth = 0.15;
      
      // If we're in the border region
      if (r_sq > (1.0 - borderWidth) * (1.0 - borderWidth)) {
        // Apply black border
        finalColor.rgb = vec3(0.0, 0.0, 0.0);
        // Make border more opaque
        alpha = min(alpha * 1.5, 1.0);
      } else {
        // Keep original color for the inner part with slightly increased saturation
        // Optionally enhance the color to make it pop more
        finalColor.rgb = finalColor.rgb * 1.1; // Brighten slightly
      }
    } else if (filter_gray_out > 0.5) {
      // Apply gray color for non-highlighted filtered points
      finalColor.rgb = vec3(0.6, 0.6, 0.6);
      alpha *= 0.7;
    }
    
    // Apply alpha blending as before
    gl_FragColor = vec4(finalColor.rgb * alpha, alpha);
  }
}