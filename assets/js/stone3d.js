(() => {
  const canvas = document.querySelector('#stone3d');
  if (!canvas) return;
  const kind = canvas.dataset.stone || 'head';
  const gl = canvas.getContext('webgl', {antialias:true, alpha:true});
  if (!gl) { canvas.classList.add('no-webgl'); return; }
  const vs=`attribute vec3 p,n;uniform mat4 m;varying vec3 N,P;void main(){vec4 q=m*vec4(p,1.);P=q.xyz;N=mat3(m)*n;gl_Position=q;}`;
  const fs=`precision mediump float;varying vec3 N,P;uniform float t,play;void main(){vec3 n=normalize(N);float l=max(.12,dot(n,normalize(vec3(-.4,.7,.8))));float grain=.5+.5*sin(P.x*37.+sin(P.y*21.)+P.z*29.);vec3 stone=mix(vec3(.11,.12,.11),vec3(.35,.37,.33),l);stone*=.8+.2*grain;float edge=pow(1.-abs(n.z),3.);vec3 glow=mix(vec3(.0,1.,.42),vec3(.58,.25,1.),.5+.5*sin(t*.45+P.y*5.));stone+=glow*edge*(.12+.15*play);gl_FragColor=vec4(stone,1.);}`;
  const shader=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);return s};
  const pr=gl.createProgram();gl.attachShader(pr,shader(gl.VERTEX_SHADER,vs));gl.attachShader(pr,shader(gl.FRAGMENT_SHADER,fs));gl.linkProgram(pr);gl.useProgram(pr);
  const verts=[], norms=[], inds=[];
  const rings=kind==='blarney'?18:24, seg=kind==='blarney'?24:32;
  for(let y=0;y<=rings;y++){
    const v=y/rings, yy=(v-.5)*1.9;
    for(let x=0;x<seg;x++){
      const a=x/seg*Math.PI*2;
      let rx,rz;
      if(kind==='head'){
        const skull=.58+.16*Math.sin(v*Math.PI); const jaw=v<.35?.76+.18*v/.35:1; rx=skull*jaw; rz=(.55+.13*Math.sin(v*Math.PI))*jaw;
        const face=Math.max(0,Math.cos(a)); rz+=face*(.10*Math.exp(-Math.pow((v-.54)*7,2))+.15*Math.exp(-Math.pow((v-.43)*10,2)));
      }else{
        rx=.92*(.96+.05*Math.sin(v*7)); rz=.28*(.94+.08*Math.sin(v*9));
      }
      const rough=.025*Math.sin(x*12.989+y*78.233)+.015*Math.sin(x*4.1-y*5.7);
      verts.push(Math.sin(a)*(rx+rough),yy,Math.cos(a)*(rz+rough)); norms.push(Math.sin(a),0,Math.cos(a));
    }
  }
  for(let y=0;y<rings;y++)for(let x=0;x<seg;x++){let a=y*seg+x,b=y*seg+(x+1)%seg,c=(y+1)*seg+x,d=(y+1)*seg+(x+1)%seg;inds.push(a,c,b,b,c,d)}
  const buf=(data,target,type)=>{const b=gl.createBuffer();gl.bindBuffer(target,b);gl.bufferData(target,new type(data),gl.STATIC_DRAW);return b};
  const pb=buf(verts,gl.ARRAY_BUFFER,Float32Array), nb=buf(norms,gl.ARRAY_BUFFER,Float32Array), ib=buf(inds,gl.ELEMENT_ARRAY_BUFFER,Uint16Array);
  const bind=(name,b)=>{const l=gl.getAttribLocation(pr,name);gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.vertexAttribPointer(l,3,gl.FLOAT,false,0,0);gl.enableVertexAttribArray(l)};bind('p',pb);bind('n',nb);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);
  const um=gl.getUniformLocation(pr,'m'), ut=gl.getUniformLocation(pr,'t'), up=gl.getUniformLocation(pr,'play'); let rot=.3, tilt=-.12, drag=false, px=0,py=0;
  const mat=(r,x)=>{let c=Math.cos(r),s=Math.sin(r),cx=Math.cos(x),sx=Math.sin(x),scale=kind==='blarney'?.72:.78;return new Float32Array([c*scale,s*sx*scale,s*cx*scale,0,0,cx*scale,-sx*scale,0,-s*scale,c*sx*scale,c*cx*scale,0,0,0,.35,1])};
  const resize=()=>{const d=Math.min(devicePixelRatio||1,2),w=canvas.clientWidth*d,h=canvas.clientHeight*d;if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h)}};
  canvas.addEventListener('pointerdown',e=>{drag=true;px=e.clientX;py=e.clientY;canvas.setPointerCapture(e.pointerId)});canvas.addEventListener('pointermove',e=>{if(!drag)return;rot+=(e.clientX-px)*.01;tilt+=(e.clientY-py)*.006;px=e.clientX;py=e.clientY});canvas.addEventListener('pointerup',()=>drag=false);
  const start=performance.now();function frame(now){resize();gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);if(!drag)rot+=.0012;gl.uniformMatrix4fv(um,false,mat(rot,tilt));gl.uniform1f(ut,(now-start)/1000);gl.uniform1f(up,document.body.classList.contains('is-playing')?1:0);gl.drawElements(gl.TRIANGLES,inds.length,gl.UNSIGNED_SHORT,0);requestAnimationFrame(frame)}requestAnimationFrame(frame);
})();
