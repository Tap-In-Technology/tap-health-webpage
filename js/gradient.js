// Stripe WebGL Gradient Animation
// Credits: https://kevinhufnagl.com and Stripe.com
// Converted to vanilla JS for static HTML sites

// ============== SHADERS ==============

const VERTEX_SHADER = `
varying vec3 v_color;

void main() {
  float time = u_time * u_global.noiseSpeed;

  vec2 noiseCoord = resolution * uvNorm * u_global.noiseFreq;

  vec2 st = 1. - uvNorm.xy;

  //
  // Tilting the plane
  //

  // Front-to-back tilt
  float tilt = resolution.y / 2.0 * uvNorm.y;

  // Left-to-right angle
  float incline = resolution.x * uvNorm.x / 2.0 * u_vertDeform.incline;

  // Up-down shift to offset incline
  float offset = resolution.x / 2.0 * u_vertDeform.incline * mix(u_vertDeform.offsetBottom, u_vertDeform.offsetTop, uv.y);

  //
  // Vertex noise
  //

  float noise = snoise(vec3(
    noiseCoord.x * u_vertDeform.noiseFreq.x + time * u_vertDeform.noiseFlow,
    noiseCoord.y * u_vertDeform.noiseFreq.y,
    time * u_vertDeform.noiseSpeed + u_vertDeform.noiseSeed
  )) * u_vertDeform.noiseAmp;

  // Fade noise to zero at edges
  noise *= 1.0 - pow(abs(uvNorm.y), 2.0);

  // Clamp to 0
  noise = max(0.0, noise);

  vec3 pos = vec3(
    position.x,
    position.y + tilt + incline + noise - offset,
    position.z
  );

  //
  // Vertex color, to be passed to fragment shader
  //

  if (u_active_colors[0] == 1.) {
    v_color = u_baseColor;
  }

  for (int i = 0; i < u_waveLayers_length; i++) {
    if (u_active_colors[i + 1] == 1.) {
      WaveLayers layer = u_waveLayers[i];

      float noise = smoothstep(
        layer.noiseFloor,
        layer.noiseCeil,
        snoise(vec3(
          noiseCoord.x * layer.noiseFreq.x + time * layer.noiseFlow,
          noiseCoord.y * layer.noiseFreq.y,
          time * layer.noiseSpeed + layer.noiseSeed
        )) / 2.0 + 0.5
      );

      v_color = blendNormal(v_color, layer.color, pow(noise, 4.));
    }
  }

  //
  // Finish
  //

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}`;

const NOISE_SHADER = `//
// Description : Array and textureless GLSL 2D/3D/4D simplex
//               noise functions.
//      Author : Ian McEwan, Ashima Arts.
//  Maintainer : stegu
//     Lastmod : 20110822 (ijm)
//     License : Copyright (C) 2011 Ashima Arts. All rights reserved.
//               Distributed under the MIT License. See LICENSE file.
//               https://github.com/ashima/webgl-noise
//               https://github.com/stegu/webgl-noise
//

vec3 mod289(vec3 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 mod289(vec4 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 permute(vec4 x) {
    return mod289(((x*34.0)+1.0)*x);
}

vec4 taylorInvSqrt(vec4 r)
{
  return 1.79284291400159 - 0.85373472095314 * r;
}

float snoise(vec3 v)
{
  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

// First corner
  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 =   v - i + dot(i, C.xxx) ;

// Other corners
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );

  //   x0 = x0 - 0.0 + 0.0 * C.xxx;
  //   x1 = x0 - i1  + 1.0 * C.xxx;
  //   x2 = x0 - i2  + 2.0 * C.xxx;
  //   x3 = x0 - 1.0 + 3.0 * C.xxx;
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy; // 2.0*C.x = 1/3 = C.y
  vec3 x3 = x0 - D.yyy;      // -1.0+3.0*C.x = -0.5 = -D.y

// Permutations
  i = mod289(i);
  vec4 p = permute( permute( permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
          + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
          + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

// Gradients: 7x7 points over a square, mapped onto an octahedron.
// The ring size 17*17 = 289 is close to a multiple of 49 (49*6 = 294)
  float n_ = 0.142857142857; // 1.0/7.0
  vec3  ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  //  mod(p,7*7)

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)

  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );

  //vec4 s0 = vec4(lessThan(b0,0.0))*2.0 - 1.0;
  //vec4 s1 = vec4(lessThan(b1,0.0))*2.0 - 1.0;
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);

//Normalise gradients
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

// Mix final noise value
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                dot(p2,x2), dot(p3,x3) ) );
}`;

const BLEND_SHADER = `//
// https://github.com/jamieowen/glsl-blend
//

// Normal

vec3 blendNormal(vec3 base, vec3 blend) {
  return blend;
}

vec3 blendNormal(vec3 base, vec3 blend, float opacity) {
  return (blendNormal(base, blend) * opacity + base * (1.0 - opacity));
}

// Screen

float blendScreen(float base, float blend) {
  return 1.0-((1.0-base)*(1.0-blend));
}

vec3 blendScreen(vec3 base, vec3 blend) {
  return vec3(blendScreen(base.r,blend.r),blendScreen(base.g,blend.g),blendScreen(base.b,blend.b));
}

vec3 blendScreen(vec3 base, vec3 blend, float opacity) {
  return (blendScreen(base, blend) * opacity + base * (1.0 - opacity));
}

// Multiply

vec3 blendMultiply(vec3 base, vec3 blend) {
  return base*blend;
}

vec3 blendMultiply(vec3 base, vec3 blend, float opacity) {
  return (blendMultiply(base, blend) * opacity + base * (1.0 - opacity));
}

// Overlay

float blendOverlay(float base, float blend) {
  return base<0.5?(2.0*base*blend):(1.0-2.0*(1.0-base)*(1.0-blend));
}

vec3 blendOverlay(vec3 base, vec3 blend) {
  return vec3(blendOverlay(base.r,blend.r),blendOverlay(base.g,blend.g),blendOverlay(base.b,blend.b));
}

vec3 blendOverlay(vec3 base, vec3 blend, float opacity) {
  return (blendOverlay(base, blend) * opacity + base * (1.0 - opacity));
}

// Hard light

vec3 blendHardLight(vec3 base, vec3 blend) {
  return blendOverlay(blend,base);
}

vec3 blendHardLight(vec3 base, vec3 blend, float opacity) {
  return (blendHardLight(base, blend) * opacity + base * (1.0 - opacity));
}

// Soft light

float blendSoftLight(float base, float blend) {
  return (blend<0.5)?(2.0*base*blend+base*base*(1.0-2.0*blend)):(sqrt(base)*(2.0*blend-1.0)+2.0*base*(1.0-blend));
}

vec3 blendSoftLight(vec3 base, vec3 blend) {
  return vec3(blendSoftLight(base.r,blend.r),blendSoftLight(base.g,blend.g),blendSoftLight(base.b,blend.b));
}

vec3 blendSoftLight(vec3 base, vec3 blend, float opacity) {
  return (blendSoftLight(base, blend) * opacity + base * (1.0 - opacity));
}

// Color dodge

float blendColorDodge(float base, float blend) {
  return (blend==1.0)?blend:min(base/(1.0-blend),1.0);
}

vec3 blendColorDodge(vec3 base, vec3 blend) {
  return vec3(blendColorDodge(base.r,blend.r),blendColorDodge(base.g,blend.g),blendColorDodge(base.b,blend.b));
}

vec3 blendColorDodge(vec3 base, vec3 blend, float opacity) {
  return (blendColorDodge(base, blend) * opacity + base * (1.0 - opacity));
}

// Color burn

float blendColorBurn(float base, float blend) {
  return (blend==0.0)?blend:max((1.0-((1.0-base)/blend)),0.0);
}

vec3 blendColorBurn(vec3 base, vec3 blend) {
  return vec3(blendColorBurn(base.r,blend.r),blendColorBurn(base.g,blend.g),blendColorBurn(base.b,blend.b));
}

vec3 blendColorBurn(vec3 base, vec3 blend, float opacity) {
  return (blendColorBurn(base, blend) * opacity + base * (1.0 - opacity));
}

// Vivid Light

float blendVividLight(float base, float blend) {
  return (blend<0.5)?blendColorBurn(base,(2.0*blend)):blendColorDodge(base,(2.0*(blend-0.5)));
}

vec3 blendVividLight(vec3 base, vec3 blend) {
  return vec3(blendVividLight(base.r,blend.r),blendVividLight(base.g,blend.g),blendVividLight(base.b,blend.b));
}

vec3 blendVividLight(vec3 base, vec3 blend, float opacity) {
  return (blendVividLight(base, blend) * opacity + base * (1.0 - opacity));
}

// Lighten

float blendLighten(float base, float blend) {
  return max(blend,base);
}

vec3 blendLighten(vec3 base, vec3 blend) {
  return vec3(blendLighten(base.r,blend.r),blendLighten(base.g,blend.g),blendLighten(base.b,blend.b));
}

vec3 blendLighten(vec3 base, vec3 blend, float opacity) {
  return (blendLighten(base, blend) * opacity + base * (1.0 - opacity));
}

// Linear burn

float blendLinearBurn(float base, float blend) {
  // Note : Same implementation as BlendSubtractf
  return max(base+blend-1.0,0.0);
}

vec3 blendLinearBurn(vec3 base, vec3 blend) {
  // Note : Same implementation as BlendSubtract
  return max(base+blend-vec3(1.0),vec3(0.0));
}

vec3 blendLinearBurn(vec3 base, vec3 blend, float opacity) {
  return (blendLinearBurn(base, blend) * opacity + base * (1.0 - opacity));
}

// Linear dodge

float blendLinearDodge(float base, float blend) {
  // Note : Same implementation as BlendAddf
  return min(base+blend,1.0);
}

vec3 blendLinearDodge(vec3 base, vec3 blend) {
  // Note : Same implementation as BlendAdd
  return min(base+blend,vec3(1.0));
}

vec3 blendLinearDodge(vec3 base, vec3 blend, float opacity) {
  return (blendLinearDodge(base, blend) * opacity + base * (1.0 - opacity));
}

// Linear light

float blendLinearLight(float base, float blend) {
  return blend<0.5?blendLinearBurn(base,(2.0*blend)):blendLinearDodge(base,(2.0*(blend-0.5)));
}

vec3 blendLinearLight(vec3 base, vec3 blend) {
  return vec3(blendLinearLight(base.r,blend.r),blendLinearLight(base.g,blend.g),blendLinearLight(base.b,blend.b));
}

vec3 blendLinearLight(vec3 base, vec3 blend, float opacity) {
  return (blendLinearLight(base, blend) * opacity + base * (1.0 - opacity));
}`;

const FRAGMENT_SHADER = `
varying vec3 v_color;

void main() {
  vec3 color = v_color;
  if (u_darken_top == 1.0) {
    vec2 st = gl_FragCoord.xy/resolution.xy;
    color.g -= pow(st.y + sin(-12.0) * st.x, u_shadow_power) * 0.4;
  }
  gl_FragColor = vec4(color, 1.0);
}`;

const SHADER_SOURCES = {
  vertex: VERTEX_SHADER,
  noise: NOISE_SHADER,
  blend: BLEND_SHADER,
  fragment: FRAGMENT_SHADER,
};

// ============== MINIGL ==============

class Uniform {
  constructor(context, options = {}) {
    this.context = context;
    this.type = options.type || "float";
    this.value = options.value;
    this.transpose = options.transpose;
    this.excludeFrom = options.excludeFrom;
    this.typeFn = {
      float: "1f",
      int: "1i",
      vec2: "2fv",
      vec3: "3fv",
      vec4: "4fv",
      mat4: "Matrix4fv",
      array: "1f",
      struct: "1f",
    }[this.type] || "1f";
  }

  update(location) {
    if (typeof this.value === "undefined") return;

    const fnName = `uniform${this.typeFn}`;
    const fn = this.context[fnName];

    if (!fn || this.context === undefined) {
      console.error("Context is undefined or uniform fn missing");
      return;
    }

    if (fnName.startsWith("uniformMatrix")) {
      fn.call(this.context, location, this.transpose || false, this.value);
    } else {
      fn.call(this.context, location, this.value);
    }
  }

  getDeclaration(name, type, length) {
    if (this.excludeFrom === type) return undefined;

    if (this.type === "array" && Array.isArray(this.value)) {
      const first = this.value[0];
      return `${first.getDeclaration(name, type, this.value.length)}\nconst int ${name}_length = ${this.value.length};`;
    }

    if (this.type === "struct" && this.value && typeof this.value === "object") {
      const entries = Object.entries(this.value);
      const structName = name.replace("u_", "").replace(/^./, (c) => c.toUpperCase());
      const members = entries
        .map(([structKey, uniform]) => uniform.getDeclaration(structKey, type)?.replace(/^uniform/, ""))
        .filter(Boolean)
        .join("");
      return `uniform struct ${structName}
                                {\n${members}\n} ${name}${length && length > 0 ? `[${length}]` : ""};`;
    }

    const len = length && length > 0 ? `[${length}]` : "";
    return `uniform ${this.type} ${name}${len};`;
  }
}

class Attribute {
  constructor(context, options) {
    this.context = context;
    this.type = options.type || context.FLOAT;
    this.normalized = options.normalized || false;
    this.buffer = context.createBuffer();
    this.target = options.target;
    this.size = options.size;
    this.values = options.values;
    this.update();
  }

  update() {
    if (typeof this.values === "undefined") return;
    this.context.bindBuffer(this.target, this.buffer);
    this.context.bufferData(this.target, this.values, this.context.STATIC_DRAW);
  }

  attach(name, program) {
    const location = this.context.getAttribLocation(program, name);
    if (this.target === this.context.ARRAY_BUFFER) {
      this.context.enableVertexAttribArray(location);
      this.context.vertexAttribPointer(location, this.size, this.type, this.normalized, 0, 0);
    }
    return location;
  }

  use(location) {
    this.context.bindBuffer(this.target, this.buffer);
    if (this.target === this.context.ARRAY_BUFFER) {
      this.context.enableVertexAttribArray(location);
      this.context.vertexAttribPointer(location, this.size, this.type, this.normalized, 0, 0);
    }
  }
}

class PlaneGeometry {
  constructor(context, width, height, xSegCount = 1, ySegCount = 1, orientation = "xz") {
    this.context = context;
    context.createBuffer();
    this.attributes = {
      position: new Attribute(context, { target: context.ARRAY_BUFFER, size: 3 }),
      uv: new Attribute(context, { target: context.ARRAY_BUFFER, size: 2 }),
      uvNorm: new Attribute(context, { target: context.ARRAY_BUFFER, size: 2 }),
      index: new Attribute(context, { target: context.ELEMENT_ARRAY_BUFFER, size: 3, type: context.UNSIGNED_SHORT }),
    };
    this.xSegCount = 1;
    this.ySegCount = 1;
    this.vertexCount = 0;
    this.quadCount = 0;
    this.width = 1;
    this.height = 1;
    this.orientation = "xz";
    this.setTopology(xSegCount, ySegCount);
    this.setSize(width || 1, height || 1, orientation);
  }

  setTopology(xSegCount = 1, ySegCount = 1) {
    this.xSegCount = xSegCount;
    this.ySegCount = ySegCount;
    this.vertexCount = (this.xSegCount + 1) * (this.ySegCount + 1);
    this.quadCount = this.xSegCount * this.ySegCount * 2;
    this.attributes.uv.values = new Float32Array(2 * this.vertexCount);
    this.attributes.uvNorm.values = new Float32Array(2 * this.vertexCount);
    this.attributes.index.values = new Uint16Array(3 * this.quadCount);

    for (let yIndex = 0; yIndex <= this.ySegCount; yIndex += 1) {
      for (let xIndex = 0; xIndex <= this.xSegCount; xIndex += 1) {
        const idx = yIndex * (this.xSegCount + 1) + xIndex;
        this.attributes.uv.values[2 * idx] = xIndex / this.xSegCount;
        this.attributes.uv.values[2 * idx + 1] = 1 - yIndex / this.ySegCount;
        this.attributes.uvNorm.values[2 * idx] = (xIndex / this.xSegCount) * 2 - 1;
        this.attributes.uvNorm.values[2 * idx + 1] = 1 - (yIndex / this.ySegCount) * 2;

        if (xIndex < this.xSegCount && yIndex < this.ySegCount) {
          const s = yIndex * this.xSegCount + xIndex;
          this.attributes.index.values[6 * s] = idx;
          this.attributes.index.values[6 * s + 1] = idx + 1 + this.xSegCount;
          this.attributes.index.values[6 * s + 2] = idx + 1;
          this.attributes.index.values[6 * s + 3] = idx + 1;
          this.attributes.index.values[6 * s + 4] = idx + 1 + this.xSegCount;
          this.attributes.index.values[6 * s + 5] = idx + 2 + this.xSegCount;
        }
      }
    }

    this.attributes.uv.update();
    this.attributes.uvNorm.update();
    this.attributes.index.update();
  }

  setSize(width = 1, height = 1, orientation = "xz") {
    this.width = width;
    this.height = height;
    this.orientation = orientation;
    if (!this.attributes.position.values || this.attributes.position.values.length !== 3 * this.vertexCount) {
      this.attributes.position.values = new Float32Array(3 * this.vertexCount);
    }

    const startX = width / -2;
    const startY = height / -2;
    const segmentWidth = width / this.xSegCount;
    const segmentHeight = height / this.ySegCount;

    for (let yIndex = 0; yIndex <= this.ySegCount; yIndex += 1) {
      const y = startY + yIndex * segmentHeight;
      for (let xIndex = 0; xIndex <= this.xSegCount; xIndex += 1) {
        const x = startX + xIndex * segmentWidth;
        const idx = yIndex * (this.xSegCount + 1) + xIndex;
        const orientationX = "xyz".indexOf(orientation[0]);
        const orientationY = "xyz".indexOf(orientation[1]);
        this.attributes.position.values[3 * idx + orientationX] = x;
        this.attributes.position.values[3 * idx + orientationY] = -y;
      }
    }

    this.attributes.position.update();
  }
}

class Material {
  constructor(context, debug, commonUniforms, vertexShaders, fragments, uniforms = {}) {
    this.context = context;
    this.debug = debug;
    this.commonUniforms = commonUniforms;
    this.uniforms = uniforms;
    this.uniformInstances = [];

    this.vertexSource = `
              precision highp float;
              attribute vec4 position;
              attribute vec2 uv;
              attribute vec2 uvNorm;
              ${this.getUniformVariableDeclarations(this.commonUniforms, "vertex")}
              ${this.getUniformVariableDeclarations(uniforms, "vertex")}
              ${vertexShaders}
            `;
    this.Source = `
              precision highp float;
              ${this.getUniformVariableDeclarations(this.commonUniforms, "fragment")}
              ${this.getUniformVariableDeclarations(uniforms, "fragment")}
              ${fragments}
            `;

    this.vertexShader = this.getShaderByType(this.context.VERTEX_SHADER, this.vertexSource);
    this.fragmentShader = this.getShaderByType(this.context.FRAGMENT_SHADER, this.Source);

    this.program = this.context.createProgram();
    this.context.attachShader(this.program, this.vertexShader);
    this.context.attachShader(this.program, this.fragmentShader);
    this.context.linkProgram(this.program);
    if (!this.context.getProgramParameter(this.program, this.context.LINK_STATUS)) {
      console.error(this.context.getProgramInfoLog(this.program));
    }

    this.context.useProgram(this.program);
    this.attachUniforms(undefined, this.commonUniforms);
    this.attachUniforms(undefined, this.uniforms);
  }

  getShaderByType(type, source) {
    const shader = this.context.createShader(type);
    if (!shader) throw new Error("Failed to create shader");
    this.context.shaderSource(shader, source);
    this.context.compileShader(shader);
    if (!this.context.getShaderParameter(shader, this.context.COMPILE_STATUS)) {
      console.error(this.context.getShaderInfoLog(shader));
    }
    this.debug("Material.compileShaderSource", { source });
    return shader;
  }

  getUniformVariableDeclarations(uniforms, type) {
    return Object.entries(uniforms)
      .map(([uniformName, uniform]) => uniform.getDeclaration(uniformName, type))
      .filter(Boolean)
      .join("\n");
  }

  attachUniforms(name, uniforms) {
    if (typeof name === "undefined") {
      Object.entries(uniforms).forEach(([uniformName, uniform]) => {
        this.attachUniforms(uniformName, uniform);
      });
      return;
    }

    const uniform = uniforms;
    if (uniform.type === "array" && Array.isArray(uniform.value)) {
      uniform.value.forEach((u, i) => {
        this.attachUniforms(`${name}[${i}]`, u);
      });
      return;
    }

    if (uniform.type === "struct" && uniform.value && typeof uniform.value === "object") {
      Object.entries(uniform.value).forEach(([structKey, u]) => {
        this.attachUniforms(`${name}.${structKey}`, u);
      });
      return;
    }

    this.debug("Material.attachUniforms", { name, uniform: uniforms });
    this.uniformInstances.push({
      uniform,
      location: this.context.getUniformLocation(this.program, name),
    });
  }
}

class Mesh {
  constructor(context, meshCollection, debug, geometry, material) {
    this.context = context;
    this.meshCollection = meshCollection;
    this.debug = debug;
    this.geometry = geometry;
    this.material = material;
    this.wireframe = false;
    this.attributeInstances = [];

    Object.entries(this.geometry.attributes).forEach(([name, attribute]) => {
      this.attributeInstances.push({
        attribute,
        location: attribute.attach(name, this.material.program),
      });
    });

    this.meshCollection.push(this);
    this.debug("Mesh.constructor", { mesh: this });
  }

  draw() {
    this.context.useProgram(this.material.program);
    this.material.uniformInstances.forEach(({ uniform, location }) => {
      uniform.update(location);
    });
    this.attributeInstances.forEach(({ attribute, location }) => {
      attribute.use(location);
    });

    this.context.drawElements(
      this.wireframe ? this.context.LINES : this.context.TRIANGLES,
      this.geometry.attributes.index.values.length,
      this.context.UNSIGNED_SHORT,
      0
    );
  }

  remove() {
    const index = this.meshCollection.indexOf(this);
    if (index >= 0) {
      this.meshCollection.splice(index, 1);
    }
  }
}

class MiniGl {
  constructor(canvas, width, height, debug = false) {
    this.canvas = canvas;
    this.gl = this.canvas.getContext("webgl", {
      antialias: true,
      preserveDrawingBuffer: false,
      powerPreference: "high-performance",
      alpha: false,
      desynchronized: true,
    });
    this.meshes = [];
    this.width = 640;
    this.height = 480;

    const debugOutput = document.location.search.toLowerCase().indexOf("debug=webgl") !== -1;

    this.debug =
      debug && debugOutput
        ? (message, ...args) => {
            const now = new Date();
            if (!this.lastDebugMsg || now.getTime() - this.lastDebugMsg.getTime() > 1000) {
              console.log("---");
            }
            console.log(`${now.toLocaleTimeString()}${Array(Math.max(0, 32 - message.length)).join(" ")}${message}: `, ...args);
            this.lastDebugMsg = now;
          }
        : () => {};

    const identityMatrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    this.commonUniforms = {
      projectionMatrix: new Uniform(this.gl, { type: "mat4", value: identityMatrix }),
      modelViewMatrix: new Uniform(this.gl, { type: "mat4", value: identityMatrix }),
      resolution: new Uniform(this.gl, { type: "vec2", value: [1, 1] }),
      aspectRatio: new Uniform(this.gl, { type: "float", value: 1 }),
    };

    if (width && height) {
      this.setSize(width, height);
    }
  }

  setSize(width = 640, height = 480) {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
    this.gl.viewport(0, 0, width, height);
    this.commonUniforms.resolution.value = [width, height];
    this.commonUniforms.aspectRatio.value = width / height;
    this.debug("MiniGL.setSize", { width, height });
  }

  setOrthographicCamera(left = 0, right = 0, top = 0, near = -2000, far = 2000) {
    this.commonUniforms.projectionMatrix.value = [
      2 / this.width, 0, 0, 0,
      0, 2 / this.height, 0, 0,
      0, 0, 2 / (near - far), 0,
      left, right, top, 1,
    ];
    this.debug("setOrthographicCamera", this.commonUniforms.projectionMatrix.value);
  }

  render() {
    this.gl.clearColor(0, 0, 0, 0);
    this.gl.clearDepth(1);
    this.meshes.forEach((mesh) => {
      mesh.draw();
    });
  }
}

// ============== GRADIENT CLASS ==============

function normalizeColor(hexCode) {
  return [
    ((hexCode >> 16) & 255) / 255,
    ((hexCode >> 8) & 255) / 255,
    (255 & hexCode) / 255,
  ];
}

class Gradient {
  constructor() {
    this.el = null;
    this.cssVarRetries = 0;
    this.maxCssVarRetries = 200;
    this.angle = 0;
    this.frameInterval = 1000 / 120;
    this.isLoadedClass = false;
    this.isScrolling = false;
    this.isStatic = false;
    this.scrollingTimeout = null;
    this.scrollingRefreshDelay = 200;
    this.isIntersecting = false;
    this.shaderFiles = SHADER_SOURCES;
    this.vertexShader = "";
    this.sectionColors = [];
    this.computedCanvasStyle = null;
    this.conf = {
      presetName: "",
      wireframe: false,
      density: [0.06, 0.16],
      zoom: 1,
      rotation: 0,
      playing: true,
    };
    this.uniforms = null;
    this.t = 1253106;
    this.last = 0;
    this.width = 0;
    this.minWidth = 1111;
    this.height = 600;
    this.xSegCount = 0;
    this.ySegCount = 0;
    this.mesh = null;
    this.material = null;
    this.geometry = null;
    this.minigl = null;
    this.scrollObserver = null;
    this.amp = 320;
    this.seed = 5;
    this.freqX = 14e-5;
    this.freqY = 29e-5;
    this.freqDelta = 1e-5;
    this.activeColors = [1, 1, 1, 1];
    this.isMetaKey = false;
    this.isGradientLegendVisible = false;
    this.isMouseDown = false;

    // Bind methods
    this.handleScroll = this.handleScroll.bind(this);
    this.handleScrollEnd = this.handleScrollEnd.bind(this);
    this.resize = this.resize.bind(this);
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.animate = this.animate.bind(this);
  }

  handleScroll() {
    clearTimeout(this.scrollingTimeout);
    this.scrollingTimeout = setTimeout(this.handleScrollEnd, this.scrollingRefreshDelay);
    if (this.isGradientLegendVisible) this.hideGradientLegend();
    if (this.conf.playing) {
      this.isScrolling = true;
      this.pause();
    }
  }

  handleScrollEnd() {
    this.isScrolling = false;
    if (this.isIntersecting) this.play();
  }

  resize() {
    if (!this.minigl || !this.mesh) return;

    let nextWidth = 0;
    let nextHeight = 0;
    if (this.el) {
      const rect = this.el.getBoundingClientRect();
      nextWidth = Math.floor(rect.width);
      nextHeight = Math.floor(rect.height);
    }

    if (nextWidth <= 0) nextWidth = window.innerWidth;
    if (nextHeight <= 0) nextHeight = this.height || window.innerHeight;

    this.width = nextWidth;
    this.height = nextHeight;

    this.minigl.setSize(this.width, this.height);
    this.minigl.setOrthographicCamera();
    this.xSegCount = Math.ceil(this.width * this.conf.density[0]);
    this.ySegCount = Math.ceil(this.height * this.conf.density[1]);
    this.mesh.geometry.setTopology(this.xSegCount, this.ySegCount);
    this.mesh.geometry.setSize(this.width, this.height);
    this.mesh.material.uniforms.u_shadow_power.value = this.width < 600 ? 5 : 6;
  }

  handleMouseDown(event) {
    if (!this.isGradientLegendVisible) return;
    this.isMetaKey = event.metaKey;
    this.isMouseDown = true;
    if (!this.conf.playing) requestAnimationFrame(this.animate);
  }

  handleMouseUp() {
    this.isMouseDown = false;
  }

  animate(timestamp) {
    if (!this.mesh || !this.minigl) return;
    if (!this.shouldSkipFrame(timestamp) || this.isMouseDown) {
      this.t += Math.min(timestamp - this.last, 1000 / 15);
      this.last = timestamp;
      if (this.isMouseDown) {
        let delta = 160;
        if (this.isMetaKey) delta = -160;
        this.t += delta;
      }
      this.mesh.material.uniforms.u_time.value = this.t;
      this.minigl.render();
    }

    if (this.last !== 0 && this.isStatic) {
      this.minigl.render();
      this.disconnect();
      return;
    }

    if (this.conf.playing || this.isMouseDown) {
      requestAnimationFrame(this.animate);
    }
  }

  addIsLoadedClass() {
    if (this.isLoadedClass || !this.el) return;
    this.isLoadedClass = true;
    this.el.classList.add("isLoaded");
    setTimeout(() => {
      if (this.el && this.el.parentElement) {
        this.el.parentElement.classList.add("isLoaded");
      }
    }, 3000);
  }

  pause() {
    this.conf.playing = false;
  }

  play() {
    requestAnimationFrame(this.animate);
    this.conf.playing = true;
  }

  initGradient(selector) {
    if (typeof document === "undefined") {
      throw new Error("Gradient.initGradient must run in a browser context.");
    }
    this.el = document.querySelector(selector);
    if (!this.el) {
      throw new Error(`Gradient: no canvas found for selector "${selector}"`);
    }
    this.connect();
    return this;
  }

  connect() {
    if (!this.el) return;
    if (document.querySelectorAll("canvas").length < 1) {
      console.log("DID NOT LOAD HERO STRIPE CANVAS");
      return;
    }

    this.minigl = new MiniGl(this.el, null, null, true);

    requestAnimationFrame(() => {
      if (!this.el) return;
      this.computedCanvasStyle = getComputedStyle(this.el);
      this.waitForCssVars();
    });
  }

  disconnect() {
    if (this.scrollObserver) {
      window.removeEventListener("scroll", this.handleScroll);
      window.removeEventListener("mousedown", this.handleMouseDown);
      window.removeEventListener("mouseup", this.handleMouseUp);
      this.scrollObserver.disconnect();
    }
    window.removeEventListener("resize", this.resize);
  }

  initMaterial() {
    if (!this.minigl || !this.sectionColors.length) {
      throw new Error("Gradient.initMaterial: missing initialization state.");
    }

    this.uniforms = {
      u_time: new Uniform(this.minigl.gl, { value: 0 }),
      u_shadow_power: new Uniform(this.minigl.gl, { value: 5 }),
      u_darken_top: new Uniform(this.minigl.gl, { value: this.el?.dataset.jsDarkenTop === "" ? 1 : 0 }),
      u_active_colors: new Uniform(this.minigl.gl, { value: this.activeColors, type: "vec4" }),
      u_global: new Uniform(this.minigl.gl, {
        value: {
          noiseFreq: new Uniform(this.minigl.gl, { value: [this.freqX, this.freqY], type: "vec2" }),
          noiseSpeed: new Uniform(this.minigl.gl, { value: 5e-6 }),
        },
        type: "struct",
      }),
      u_vertDeform: new Uniform(this.minigl.gl, {
        value: {
          incline: new Uniform(this.minigl.gl, { value: Math.sin(this.angle) / Math.cos(this.angle) }),
          offsetTop: new Uniform(this.minigl.gl, { value: -0.5 }),
          offsetBottom: new Uniform(this.minigl.gl, { value: -0.5 }),
          noiseFreq: new Uniform(this.minigl.gl, { value: [3, 4], type: "vec2" }),
          noiseAmp: new Uniform(this.minigl.gl, { value: this.amp }),
          noiseSpeed: new Uniform(this.minigl.gl, { value: 10 }),
          noiseFlow: new Uniform(this.minigl.gl, { value: 3 }),
          noiseSeed: new Uniform(this.minigl.gl, { value: this.seed }),
        },
        type: "struct",
        excludeFrom: "fragment",
      }),
      u_baseColor: new Uniform(this.minigl.gl, { value: this.sectionColors[0], type: "vec3", excludeFrom: "fragment" }),
      u_waveLayers: new Uniform(this.minigl.gl, { value: [], excludeFrom: "fragment", type: "array" }),
    };

    for (let i = 1; i < this.sectionColors.length; i += 1) {
      const waveLayers = this.uniforms.u_waveLayers.value;
      waveLayers.push(
        new Uniform(this.minigl.gl, {
          value: {
            color: new Uniform(this.minigl.gl, { value: this.sectionColors[i], type: "vec3" }),
            noiseFreq: new Uniform(this.minigl.gl, { value: [2 + i / this.sectionColors.length, 3 + i / this.sectionColors.length], type: "vec2" }),
            noiseSpeed: new Uniform(this.minigl.gl, { value: 11 + 0.3 * i }),
            noiseFlow: new Uniform(this.minigl.gl, { value: 6.5 + 0.3 * i }),
            noiseSeed: new Uniform(this.minigl.gl, { value: this.seed + 10 * i }),
            noiseFloor: new Uniform(this.minigl.gl, { value: 0.1 }),
            noiseCeil: new Uniform(this.minigl.gl, { value: 0.63 + 0.07 * i }),
          },
          type: "struct",
        })
      );
    }

    this.vertexShader = [this.shaderFiles.noise, this.shaderFiles.blend, this.shaderFiles.vertex].join("\n\n");

    return new Material(
      this.minigl.gl,
      this.minigl.debug,
      this.minigl.commonUniforms,
      this.vertexShader,
      this.shaderFiles.fragment,
      this.uniforms
    );
  }

  initMesh() {
    if (!this.minigl) return;
    this.material = this.initMaterial();
    this.geometry = new PlaneGeometry(this.minigl.gl);
    this.mesh = new Mesh(this.minigl.gl, this.minigl.meshes, this.minigl.debug, this.geometry, this.material);
  }

  shouldSkipFrame(timestamp) {
    const delta = this.last === 0 ? Infinity : timestamp - this.last;
    return !!window.document.hidden || !this.conf.playing || (!this.isMouseDown && delta < this.frameInterval);
  }

  updateFrequency(delta) {
    this.freqX += delta;
    this.freqY += delta;
  }

  toggleColor(index) {
    this.activeColors[index] = this.activeColors[index] === 0 ? 1 : 0;
  }

  showGradientLegend() {
    if (this.width <= this.minWidth) return;
    this.isGradientLegendVisible = true;
    document.body.classList.add("isGradientLegendVisible");
  }

  hideGradientLegend() {
    this.isGradientLegendVisible = false;
    document.body.classList.remove("isGradientLegendVisible");
  }

  init() {
    this.initGradientColors();
    this.initMesh();
    this.resize();
    requestAnimationFrame(this.animate);
    window.addEventListener("resize", this.resize);
    return this;
  }

  waitForCssVars() {
    if (this.computedCanvasStyle && this.computedCanvasStyle.getPropertyValue("--gradient-color-1").indexOf("#") !== -1) {
      this.init();
      this.addIsLoadedClass();
      return;
    }

    this.cssVarRetries += 1;
    if (this.cssVarRetries > this.maxCssVarRetries) {
      this.sectionColors = [0xff0000, 0xff0000, 0xff00ff, 0x00ff00, 0x0000ff].map(normalizeColor);
      this.init();
      return;
    }
    requestAnimationFrame(() => this.waitForCssVars());
  }

  initGradientColors() {
    if (!this.computedCanvasStyle) {
      this.sectionColors = [];
      return;
    }

    this.sectionColors = ["--gradient-color-1", "--gradient-color-2", "--gradient-color-3", "--gradient-color-4"]
      .map((cssPropertyName) => {
        let hex = this.computedCanvasStyle?.getPropertyValue(cssPropertyName).trim();
        if (!hex) return null;

        if (hex.length === 4) {
          const hexTemp = hex
            .substr(1)
            .split("")
            .map((char) => char + char)
            .join("");
          hex = `#${hexTemp}`;
        }
        return `0x${hex.substr(1)}`;
      })
      .filter(Boolean)
      .map((hex) => normalizeColor(Number(hex)));
  }
}

// Export for use
window.Gradient = Gradient;
