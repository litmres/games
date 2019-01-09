const SpriteRenderer = (function() {

	const vsSource = `
		precision mediump float;

		attribute vec4 aVertexPosition;
		attribute vec2 aTextureCoord;
		attribute float aTextureIndex;
		uniform mat4 uProjectionMatrix;
		uniform mat4 uViewMatrix;
		varying highp vec2 vTextureCoord;
		varying highp float zDist;
		varying highp float textureIndex;

		void main(void) {
		  gl_Position = uProjectionMatrix * uViewMatrix * aVertexPosition;
		  vTextureCoord = aTextureCoord;
		  textureIndex = aTextureIndex;
		  zDist = gl_Position.z / 50.0 + abs(gl_Position.x / 30.0);
		}
	`;

	// const fsSource = `
	// 	precision mediump float;

	// 	float rand(vec2 co, float time){
	// 	  return fract(sin(dot(co.xy ,vec2(12.9898 + time,78.233 + time))) * 43758.5453);
	// 	}

	// 	varying highp vec2 vTextureCoord;
	// 	uniform sampler2D uTexture;
	// 	uniform float uTime;
	// 	varying highp float val;

	// 	void main(void) {
	// 		vec4 color = texture2D(uTexture, vTextureCoord);
	// 		gl_FragColor = color;
	// 	}
	// `;

	const fsSource = `
		precision mediump float;

		uniform sampler2D uTexture[16];
		uniform float uTime;
		uniform vec4 uBackground;
		varying highp vec2 vTextureCoord;
		varying highp float zDist;
		varying highp float textureIndex;

		float rand(vec2 co, float time){
		  return fract(sin(dot(co.xy ,vec2(12.9898 + time,78.233 + time))) * 43758.5453);
		}

		vec4 reduceColor(vec4 color, vec2 co, float amount) {
			vec4 oldColor = color;
			color.x += rand(co, uTime/1000.0) -.5;
			color.y += rand(co, uTime/1000.0) -.5;
			color.z += rand(co, uTime/1000.0) -.5;

			vec4 colors[4];
			colors[0] = vec4(0.0,  0.0, 0.0, 0.0);
			colors[1] = vec4(0.0,  0.0, 0.0, 1.0);
			colors[2] = vec4(0.99, 0.5, 0.5, 1.0);
			colors[3] = vec4(0.3,  0.7, 0.2, 1.0);

			vec4 newColor = colors[0];
			for (int i = 1; i < 4; i++) {
				if (distance(color, colors[i]) < distance(color, newColor)) {
					newColor = colors[i];
				}
			}
			return mix(oldColor, newColor, amount);
		}

		vec4 darkenColor(vec4 color, float zDist) {
			return mix(color, uBackground, vec4(zDist, zDist, zDist, 0.0));
		}

		vec4 getTextureColor(float textureIndexFloat, vec2 vTextureCoord) {
			int textureIndex = int(floor(textureIndexFloat));
			if (textureIndex == 0) {
				return texture2D(uTexture[0], vTextureCoord);
			} else if(textureIndex == 1) {
				return texture2D(uTexture[1], vTextureCoord);
			} else if(textureIndex == 2) {
				return texture2D(uTexture[2], vTextureCoord);
			} else if(textureIndex == 3) {
				return texture2D(uTexture[3], vTextureCoord);
			} else if(textureIndex == 4) {
				return texture2D(uTexture[4], vTextureCoord);
			} else if(textureIndex == 5) {
				return texture2D(uTexture[5], vTextureCoord);				
			} else if(textureIndex == 6) {
				return texture2D(uTexture[6], vTextureCoord);
			} else if(textureIndex == 7) {
				return texture2D(uTexture[7], vTextureCoord);				
			} else if(textureIndex == 8) {
				return texture2D(uTexture[8], vTextureCoord);				
			} else if(textureIndex == 9) {
				return texture2D(uTexture[9], vTextureCoord);				
			} else if(textureIndex == 10) {
				return texture2D(uTexture[10], vTextureCoord);
			} else if(textureIndex == 11) {
				return texture2D(uTexture[11], vTextureCoord);
			} else if(textureIndex == 12) {
				return texture2D(uTexture[12], vTextureCoord);
			} else if(textureIndex == 13) {
				return texture2D(uTexture[13], vTextureCoord);				
			} else if(textureIndex == 14) {
				return texture2D(uTexture[14], vTextureCoord);
			} else if(textureIndex == 15) {
				return texture2D(uTexture[15], vTextureCoord);
			} else {
				return texture2D(uTexture[0], vTextureCoord);
			}
		}

		vec4 blur(vec4 color, vec2 vTextureCoord, float value) {
			if (color.w > 0.0) {
				vec2 vTex = vTextureCoord;
				vTex.x = vTex.x + (rand(vTextureCoord, uTime + 0.0) - .5) / 100.0;
				vTex.y = vTex.y + (rand(vTextureCoord, uTime + 1.0) - .5) / 100.0;
				vec4 newColor = mix(color, getTextureColor(textureIndex, vTex), value);
				newColor.w = color.w;
				color = newColor;
			}
			return color;			
		}

		void main(void) {
			vec4 color = getTextureColor(textureIndex, vTextureCoord);
			color = blur(color, vTextureCoord, min(1.0, (zDist * 1.5)));
			color = darkenColor(color, zDist * .8);
//			color = reduceColor(color, vTextureCoord, min(1.0, (zDist * 2.0)));
			gl_FragColor = color;
		}
	`;
	const INDEX_ARRAY_PER_SPRITE = new Uint16Array([
		0,  1,  2,
		0,  2,  3,
	]);

	const FLOAT_PER_VERTEX = 3;			//	x,y,z
	const TEXTURE_FLOAT_PER_VERTEX = 2;	//	x,y
	const VERTICES_PER_SPRITE = 4;		//	4 corners
	const SIZE_INCREASE = 100;
	const baseZ = -4;	

	const CLEAN_FREQUENCY = .1;

	function Renderer(gl) {
		if(!TextureFactory) {
			console.error("texture_meta.js missing.");
		}

		this.gl = gl;
		const shaderProgram = initShaderProgram(gl, vsSource, fsSource);
		gl.useProgram(shaderProgram);

		gl.enable(gl.CULL_FACE);
		gl.cullFace(gl.BACK);		

		this.programInfo = {
	      vertexLocation: 		gl.getAttribLocation(shaderProgram,  'aVertexPosition'),
	      textureCoordLocation: gl.getAttribLocation(shaderProgram,  'aTextureCoord'),
	      textureIndexLocation: gl.getAttribLocation(shaderProgram,  'aTextureIndex'),
	      projectionLocation: 	gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
	      viewLocation: 		gl.getUniformLocation(shaderProgram, 'uViewMatrix'),
	      uTextureLocation: 	gl.getUniformLocation(shaderProgram, 'uTexture'),
	      timeLocation:         gl.getUniformLocation(shaderProgram, 'uTime'),
	      backgroundLocation:   gl.getUniformLocation(shaderProgram, 'uBackground'),
		};

		this.positionBuffer = null;
		this.textureCoordBuffer = null;
		this.textureIndexBuffer = null;
		this.indexBuffer = null;
		this.textureBuffer = new Int32Array();

		this.spriteBufferSize = 0;

		this.cachedData = {
			location: {},
			indices: [],
		};

		this.tempVariables = {
			tempViewMatrix: mat4.create(),
			tempPositions: new Float32Array(FLOAT_PER_VERTEX * VERTICES_PER_SPRITE),
		};

		this.spriteMap = {
		};
		this.nextIndex = 0;
		this.recycledIndices = [];
		this.indicesMap = [];
		this.backgroundColor = [ 0.0, 0.0, 0.0, 1.0 ];

		const fieldOfView = 45 * Math.PI / 180;   // in radians
		const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
		const zNear = 0.1;
		const zFar = 100.0;
		const projectionMatrix = mat4.create();
		mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);
		gl.uniformMatrix4fv(this.programInfo.projectionLocation, false, projectionMatrix);
	}

	function getFramePositions(renderer, texture, type, x, y, z, scale) {
		const positions = renderer.tempVariables.tempPositions;
		if (type === 'sprite') {
			const { left, right, top, bottom } = texture.positions;
			positions[0] = left * scale;
			positions[1] = top * scale;
			positions[2] = baseZ;
			positions[3] = right * scale;
			positions[4] = top  * scale;
			positions[5] = baseZ;
			positions[6] = right * scale;
			positions[7] = bottom * scale;
			positions[8] = baseZ;
			positions[9] = left * scale;
			positions[10] = bottom * scale;
			positions[11] = baseZ;

			for(let i=0; i<positions.length; i+=3) {
				positions[i] 	+= x;
				positions[i+1] 	+= y;
				positions[i+2] 	+= z;
			}
//			mat4.identity(viewMatrix);
//			mat4.rotate(viewMatrix, viewMatrix, -y / 3, [ 1, 0, 0 ]);

		} else if(type === "floor") {
			positions[0] = 0;
			positions[1] = 0;
			positions[2] = baseZ;
			positions[3] = 1;
			positions[4] = 0;
			positions[5] = 0 + baseZ;
			positions[6] = 1;
			positions[7] = 0;
			positions[8] = -1 + baseZ;
			positions[9] = 0;
			positions[10] = 0;
			positions[11] = -1 + baseZ;

			for(let i=0; i<positions.length; i+=3) {
				positions[i] 	+= x - .5;
				positions[i+1] 	+= y;
				positions[i+2] 	+= z - .5;
			}
		} else if(type === "ceiling") {
			positions[0] = 0;
			positions[1] = 0;
			positions[2] = -1 + baseZ;
			positions[3] = 1;
			positions[4] = 0;
			positions[5] = -1 + baseZ;
			positions[6] = 1;
			positions[7] = 0;
			positions[8] = 0 + baseZ;
			positions[9] = 0;
			positions[10] = 0;
			positions[11] = 0 + baseZ;

			for(let i=0; i<positions.length; i+=3) {
				positions[i] 	+= x - .5;
				positions[i+1] 	+= y;
				positions[i+2] 	+= z - .5;
			}
		} else if(type === "leftwall") {
			positions[0] = 0;
			positions[1] = 0;
			positions[2] = 0 + baseZ;
			positions[3] = 0;
			positions[4] = 0;
			positions[5] = -1 + baseZ;
			positions[6] = 0;
			positions[7] = 1;
			positions[8] = -1 + baseZ;
			positions[9] = 0;
			positions[10] = 1;
			positions[11] = 0 + baseZ;

			for(let i=0; i<positions.length; i+=3) {
				positions[i] 	+= x - .5;
				positions[i+1] 	+= y;
				positions[i+2] 	+= z - .5;
			}
		} else if(type === "rightwall") {
			positions[0] = 0;
			positions[1] = 0;
			positions[2] = -1 + baseZ;
			positions[3] = 0;
			positions[4] = 0;
			positions[5] = 0 + baseZ;
			positions[6] = 0;
			positions[7] = 1;
			positions[8] = 0 + baseZ;
			positions[9] = 0;
			positions[10] = 1;
			positions[11] = -1 + baseZ;

			for(let i=0; i<positions.length; i+=3) {
				positions[i] 	+= x - .5 + 1;
				positions[i+1] 	+= y;
				positions[i+2] 	+= z - .5;
			}
		} else if(type === "wall") {
			positions[0] = 0;
			positions[1] = 0;
			positions[2] = -1 + baseZ;
			positions[3] = 1;
			positions[4] = 0;
			positions[5] = -1 + baseZ;
			positions[6] = 1;
			positions[7] = 1;
			positions[8] = -1 + baseZ;
			positions[9] = 0;
			positions[10] = 1;
			positions[11] = -1 + baseZ;
			
			for(let i=0; i<positions.length; i+=3) {
				positions[i] 	+= x - .5;
				positions[i+1] 	+= y;
				positions[i+2] 	+= z - .5;
			}
		}
		return positions;
	};

	function ensureBuffer(renderer, size) {
		if (size > renderer.spriteBufferSize) {
			allocateBuffer(renderer, size + SIZE_INCREASE);			
		}
	}

	function getSpriteData(renderer, id) {
		const { spriteMap } = renderer;
		if (spriteMap[id]) {
			return spriteMap[id];
		}
		const { recycledIndices, spriteBufferSize } = renderer;
		if (recycledIndices.length) {
			const recycledData = recycledIndices.pop();
			spriteMap[id] = recycledData;
			return recycledData;
		}
		const slotIndex = renderer.nextIndex++;

		ensureBuffer(renderer, slotIndex + 1);

		return spriteMap[id] = {
			slotIndex,
			spritePositions: new Float32Array(FLOAT_PER_VERTEX * VERTICES_PER_SPRITE),
			spriteTextureCoordinates: new Float32Array(TEXTURE_FLOAT_PER_VERTEX * VERTICES_PER_SPRITE),
			spriteTextureIndex: -1,
			time: 0,
			deleted: false,
		};
	}

	function cleanSpriteMap(renderer, now) {
		const { spriteMap, recycledIndices } = renderer;
		for(let s in spriteMap) {
			const spriteData = spriteMap[s];
			if (spriteData.time !== now) {
				recycledIndices.push(spriteData);
				delete spriteMap[s];
			}
		}
	}

	Renderer.prototype.drawSprites = function(sprites, now, x, y, z) {
		const { gl, programInfo } = this;
		clearScene(gl, this);
		setLocation(gl, programInfo, x, y, z, this.cachedData.location, this.tempVariables.tempViewMatrix);
		setTime(gl, programInfo, now);
		ensureBuffer(this, sprites.length);

		const textureFactory = gl.getTextureFactory();
		let count = 0;
		for(let i = 0; i < sprites.length; i++) {
			const sprite = sprites[i];
			const { name, label } = sprite;
			const textureData = textureFactory.getTextureData(name, label, now);
			if (textureData) {
				const { x, y, z, type, id, scale } = sprite;
				addFrame(this, textureData, id, count, type, x, y, z, scale, now);
				count ++;
			}
		}
		if(Math.random()<CLEAN_FREQUENCY) {
			cleanSpriteMap(this, now);
		}
		draw(gl, count);
	};

	function setTime(gl, programInfo, now) {
		gl.uniform1f(programInfo.timeLocation, now);
	}

	Renderer.prototype.setBackgroundColor = function(color) {
		const { gl, programInfo } = this;
		this.backgroundColor = [
			(color >> 16) % 256 / 256,
			(color >> 8) % 256 / 256,
			(color >> 0) % 256 / 256,
			1.0,
		];
		gl.uniform4f(programInfo.backgroundLocation,
			this.backgroundColor[0],
			this.backgroundColor[1],
			this.backgroundColor[2],
			this.backgroundColor[3],
		);
	};

	function setLocation(gl, programInfo, x, y, z, cachedLocation, viewMatrix) {
		if (cachedLocation.x !== x || cachedLocation.y !== y || cachedLocation.z !== z) {
			mat4.identity(viewMatrix);
			mat4.rotate(viewMatrix, viewMatrix, y / 3, [ 1, 0, 0 ]);
			mat4.translate(viewMatrix, viewMatrix, [ -x || 0, (-y || 0) - .5, -z || 0 ]);
			gl.uniformMatrix4fv(programInfo.viewLocation, false, viewMatrix);
			cachedLocation.x = x;
			cachedLocation.y = y;
			cachedLocation.z = z;
		}
	}

	function resizeBuffer(gl, bufferType, buffer, newBufferSize) {
		gl.bindBuffer(bufferType, buffer);
		const bufferSize = gl.getBufferParameter(bufferType, gl.BUFFER_SIZE);
		const arrayBuffer = new DataView(new ArrayBuffer(bufferSize));
		gl.getBufferSubData(bufferType, 0, arrayBuffer);
		gl.bufferData(bufferType, newBufferSize, gl.STATIC_DRAW);
		gl.bufferSubData(bufferType, 0, arrayBuffer);
		return buffer;
	}

	function createVertexAttributeBuffer(gl, location, numComponents) {
		const buffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
		const type = gl.FLOAT;
		const normalize = false;
		const stride = 0;
		const offset = 0;
		gl.vertexAttribPointer(location,
		    numComponents,
		    type,
		    normalize,
		    stride,
		    offset);
		gl.enableVertexAttribArray(location);
		return buffer;
	}

	function allocateBuffer(renderer, size) {
		if (renderer.spriteBufferSize < size) {
			const { gl, programInfo } = renderer;
			if (!renderer.positionBuffer) {
				renderer.positionBuffer = createVertexAttributeBuffer(gl, programInfo.vertexLocation, FLOAT_PER_VERTEX);
			}
			resizeBuffer(gl, gl.ARRAY_BUFFER, renderer.positionBuffer, size * VERTICES_PER_SPRITE * FLOAT_PER_VERTEX * Float32Array.BYTES_PER_ELEMENT);

			if (!renderer.textureCoordBuffer) {
				renderer.textureCoordBuffer = createVertexAttributeBuffer(gl, programInfo.textureCoordLocation, TEXTURE_FLOAT_PER_VERTEX);
			}
			resizeBuffer(gl, gl.ARRAY_BUFFER, renderer.textureCoordBuffer, size * VERTICES_PER_SPRITE * TEXTURE_FLOAT_PER_VERTEX * Float32Array.BYTES_PER_ELEMENT);

			if (!renderer.textureIndexBuffer) {
				renderer.textureIndexBuffer = createVertexAttributeBuffer(gl, programInfo.textureIndexLocation, 1);
			}
			resizeBuffer(gl, gl.ARRAY_BUFFER, renderer.textureIndexBuffer, size * VERTICES_PER_SPRITE * Float32Array.BYTES_PER_ELEMENT);

			if (!renderer.indexBuffer) {
				renderer.indexBuffer = gl.createBuffer();
			}
			resizeBuffer(gl, gl.ELEMENT_ARRAY_BUFFER, renderer.indexBuffer, size * INDEX_ARRAY_PER_SPRITE.length * Uint16Array.BYTES_PER_ELEMENT);
			
			renderer.spriteBufferSize = size;
		}
	}

	function clearScene(gl, renderer) {
		gl.clearColor.apply(gl, renderer.backgroundColor);  // Clear to black, fully opaque
		gl.clearDepth(1.0);                 // Clear everything
		gl.enable(gl.DEPTH_TEST);           // Enable depth testing
		gl.depthFunc(gl.LEQUAL);            // Near things obscure far things
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	}

	function floatArrayEqual(a, b) {
//		if (a.length !== b.length) return false;
	  	for (let i=0; i < a.length; i++) {
	    	if (a[i] !== b[i]) return false;
	  	}
	  	return true;
	}

	function addFrame(renderer, texture, id, frameIndex, type, x, y, z, scale, now) {
		const positions = getFramePositions(renderer, texture, type, x, y, z, scale);
		const { gl, programInfo, cachedData, indicesMap } = renderer;
		const spriteData = getSpriteData(renderer, id);
		spriteData.time = now;
		const { slotIndex, spritePositions, spriteTextureCoordinates, spriteTextureIndex } = spriteData;

		if (indicesMap[frameIndex] !== slotIndex) {
			let slotIndices = cachedData.indices[slotIndex];
			if (!slotIndices) {
				slotIndices = INDEX_ARRAY_PER_SPRITE.map(value => value + slotIndex * VERTICES_PER_SPRITE);
				cachedData.indices[slotIndex] = slotIndices;
			}
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, renderer.indexBuffer);
			gl.bufferSubData(gl.ELEMENT_ARRAY_BUFFER, frameIndex * slotIndices.length * Uint16Array.BYTES_PER_ELEMENT, slotIndices);
			indicesMap[frameIndex] = slotIndex;
		}

		if (!floatArrayEqual(positions, spritePositions)) {
			gl.bindBuffer(gl.ARRAY_BUFFER, renderer.positionBuffer);
			gl.bufferSubData(gl.ARRAY_BUFFER, slotIndex * VERTICES_PER_SPRITE * FLOAT_PER_VERTEX * Float32Array.BYTES_PER_ELEMENT, positions);
			spritePositions.set(positions);
		}

		if (!floatArrayEqual(texture.coordinates, spriteTextureCoordinates)) {
			gl.bindBuffer(gl.ARRAY_BUFFER, renderer.textureCoordBuffer);
			gl.bufferSubData(gl.ARRAY_BUFFER, slotIndex * VERTICES_PER_SPRITE * TEXTURE_FLOAT_PER_VERTEX * Float32Array.BYTES_PER_ELEMENT, texture.coordinates);
			spriteTextureCoordinates.set(texture.coordinates);
		}

		const textureIndex = texture.indexBuffer[0];
		if (textureIndex != spriteTextureIndex) {
			if (textureIndex >= renderer.textureBuffer.length) {
				renderer.textureBuffer = new Int32Array(textureIndex + 1).map((a, index) => index);
				gl.uniform1iv(programInfo.uTextureLocation, renderer.textureBuffer);
			}
		    gl.bindBuffer(gl.ARRAY_BUFFER, renderer.textureIndexBuffer);
			gl.bufferSubData(gl.ARRAY_BUFFER, slotIndex * VERTICES_PER_SPRITE * Float32Array.BYTES_PER_ELEMENT, texture.indexBuffer);
			spriteData.spriteTextureIndex = textureIndex;
		}
	};

	function draw(gl, count) {
		if (count > 0) {
			gl.drawElements(gl.TRIANGLES, count * INDEX_ARRAY_PER_SPRITE.length, gl.UNSIGNED_SHORT, 0);
		}
	}

	function initShaderProgram(gl, vsSource, fsSource) {
	  const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
	  const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

	  const shaderProgram = gl.createProgram();
	  gl.attachShader(shaderProgram, vertexShader);
	  gl.attachShader(shaderProgram, fragmentShader);
	  gl.linkProgram(shaderProgram);

	  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
	    console.error('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
	    return null;
	  }

	  return shaderProgram;
	}

	function loadShader(gl, type, source) {
	  const shader = gl.createShader(type);
	  gl.shaderSource(shader, source);
	  gl.compileShader(shader);

	  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
	    console.error('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
	    gl.deleteShader(shader);
	    return null;
	  }
	  return shader;
	}

	WebGL2RenderingContext.prototype.getSpriteRenderer = function() {
		if(!this.spriteRenderer) {
			this.spriteRenderer = new SpriteRenderer.Renderer(this);
		}
		return this.spriteRenderer;
	};

	return {
		Renderer,
	};
})();