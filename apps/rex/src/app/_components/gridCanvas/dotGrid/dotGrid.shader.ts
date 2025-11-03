import { GlProgram } from 'pixi.js';

const vertShader = `
in vec2 aPosition;
in vec2 aUV;

out vec2 vUV;

uniform mat3 uProjectionMatrix;
uniform mat3 uWorldTransformMatrix;

uniform mat3 uTransformMatrix;

void main() {

    mat3 mvp = uProjectionMatrix * uWorldTransformMatrix * uTransformMatrix;
    gl_Position = vec4((mvp * vec3(aPosition, 1.0)).xy, 0.0, 1.0);

    vUV = aUV;
}
`;

const fragShader = `
precision mediump float;

uniform vec2 translate;
uniform vec2 canvasSize;
uniform vec2 scale;
uniform float pixelRatio;
uniform vec4 boundingBox;
uniform vec4 selectionBox;
uniform float isDark;

// from Inigo Quilez
float sdBox(vec2 p, vec2 b) {
  vec2 d = abs(p) - b;
  return length(max(d, 0.0)) + min(max(d.x,d.y), 0.0);
}

float sdBoxTL(vec2 p, vec2 b) {
  return sdBox(p - b, abs(b));
}

void main() {
  // pos maps to canvas coords (not dom etc.)
  vec2 pos = ((vec2(0, canvasSize.y) + gl_FragCoord.xy / pixelRatio * vec2(1, -1)) - translate) / scale;

  // grid uvs
  float increment = clamp(floor(log(scale.x * 10.) / log(2.)), 1., 3.);
  float gridSpacingScalar = pow(2., increment * -1.);
  float gridSpacing = 120. * gridSpacingScalar;

  // base white colour
  gl_FragColor = vec4(vec3(249.)/255.,1.);

  // dots - use pythagoras to position the dot in the top-left of the cell
  // this keeps dots in the same position when jumping between zoom steps
  float dotRadius = 1.125 * (1.0 + (max(0.0, scale.x - 2.0)));
  float dotOffset = sqrt(pow(dotRadius, 2.) * 2.) / sqrt(pow(gridSpacing * scale.x, 2.) * 2.);
  vec2 dotCenter = (mod(pos, gridSpacing) - (dotOffset * gridSpacing)) * scale.x;
  float opacity = (1. - (max(0., 0.4 - scale.x) * 3.));

  gl_FragColor = mix(gl_FragColor,
    vec4(vec3(221.,220.,219.)/255.,1.), 
    smoothstep(dotRadius, dotRadius * .99,length(dotCenter)) * opacity);

  // boundary size
  vec2 size = boundingBox.ba - boundingBox.xy;
  size /= 2.;

  float strokeThickness = 1.5/scale.x;
  
  float box = sdBoxTL(pos-boundingBox.xy, size) - 10.;

  // draw bg
  gl_FragColor = mix(gl_FragColor, 
    vec4(vec3(245.)/255.,1.), 
    smoothstep(-0.,0.01, box));

  // draw boundary shadow
  gl_FragColor = mix(gl_FragColor, 
    vec4(vec3(240.)/255.,1.), 
    smoothstep(-0.,0.01, box) *
    smoothstep(8./scale.x,0., box) 
  );

  // stroke
  gl_FragColor = mix(gl_FragColor, 
    vec4(vec3(234.,233.,232.)/255.,1.), 
    smoothstep(-0.,.1, box) *
    smoothstep(0.,-.1, box - strokeThickness)
  );

  // selectionBox
  float sBox = sdBoxTL(pos-selectionBox.xy, selectionBox.zw / 2.);

  if(selectionBox.zw != vec2(0.)) {
    // draw selectionBox stroke
    gl_FragColor = mix(gl_FragColor, 
      vec4(vec3(100.,200.,250.)/255.,1.), 
      smoothstep(2./scale.x,0., sBox)*.2
    );
    gl_FragColor = mix(gl_FragColor, 
      vec4(vec3(106., 202., 240.)/255.,1.), 
      smoothstep(-0.,.1, sBox) *
      smoothstep(0.,-.1, sBox - 1./scale.x)
    );
  }
}
`;

export const dotGridProgram = GlProgram.from({
  vertex: vertShader,
  fragment: fragShader,
});
