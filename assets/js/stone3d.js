(() => {
  const canvas = document.querySelector('#stone3d');
  if (!canvas) return;
  const kind = canvas.dataset.stone || 'head';
  const gl = canvas.getContext('webgl', {antialias:true, alpha:true, premultipliedAlpha:false});
  if (!gl) { canvas.classList.add('no-webgl'); return; }

  const vs = `
    attribute vec3 p,n;
    uniform mat4 m;
    varying vec3 N,P;
    void main(){
      vec4 q=m*vec4(p,1.0);
      P=q.xyz;
      N=normalize(mat3(m)*n);
      gl_Position=q;
    }
  `;
  const fs = `
    precision highp float;
    varying vec3 N,P;
    uniform float t,play,kind;

    float hash(vec3 p){
      p=fract(p*.3183099+.1);
      p*=17.0;
      return fract(p.x*p.y*p.z*(p.x+p.y+p.z));
    }
    float noise(vec3 p){
      vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
      return mix(mix(mix(hash(i+vec3(0,0,0)),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
    }
    void main(){
      vec3 n=normalize(N);
      vec3 key=normalize(vec3(-.45,.72,.65));
      vec3 fill=normalize(vec3(.65,.2,.35));
      float kd=max(0.0,dot(n,key));
      float fd=max(0.0,dot(n,fill));
      float hemi=.36+.34*(n.y*.5+.5);
      float macro=noise(P*4.0);
      float micro=noise(P*24.0);
      float pits=pow(noise(P*58.0),5.0);
      vec3 dark=kind<.5?vec3(.105,.115,.105):vec3(.115,.11,.12);
      vec3 light=kind<.5?vec3(.40,.42,.36):vec3(.38,.37,.34);
      vec3 stone=mix(dark,light,.22+.55*kd+.18*fd+.20*macro);
      stone*=.82+.22*micro-.22*pits;
      float moss=smoothstep(.57,.86,noise(P*7.5+vec3(0.0,1.7,0.0)))*smoothstep(-.2,.65,n.y);
      vec3 mossCol=vec3(.10,.20,.075);
      stone=mix(stone,mossCol,moss*.52);
      float lichen=smoothstep(.74,.94,noise(P*15.0+vec3(3.0,0.0,2.0)));
      stone=mix(stone,vec3(.42,.46,.25),lichen*.22);
      float rim=pow(1.0-max(0.0,n.z),2.8);
      vec3 neon=mix(vec3(0.0,1.0,.42),vec3(.60,.25,1.0),.5+.5*sin(t*.35+P.y*4.0));
      stone += neon*rim*(.07+.17*play);
      float spec=pow(max(0.0,dot(reflect(-key,n),vec3(0,0,1))),28.0);
      stone += vec3(.16,.18,.15)*spec*(.18+.18*micro);
      float vign=smoothstep(1.65,.2,length(P.xy));
      stone*=.82+.18*vign;
      gl_FragColor=vec4(stone,1.0);
    }
  `;

  const shader=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);return s};
  const pr=gl.createProgram();gl.attachShader(pr,shader(gl.VERTEX_SHADER,vs));gl.attachShader(pr,shader(gl.FRAGMENT_SHADER,fs));gl.linkProgram(pr);gl.useProgram(pr);

  const verts=[], norms=[], inds=[];
  const rings=kind==='blarney'?52:64;
  const seg=kind==='blarney'?72:88;
  const rnd=(x,y)=>Math.sin(x*12.9898+y*78.233)*43758.5453%1;

  function profile(v,a){
    const ca=Math.cos(a), sa=Math.sin(a);
    let rx,rz,y=(v-.5)*1.95;
    if(kind==='head'){
      const skull=.56+.18*Math.sin(v*Math.PI);
      const jaw=v<.34?.76+.24*(v/.34):1.0;
      rx=skull*jaw;
      rz=(.53+.12*Math.sin(v*Math.PI))*jaw;
      const front=Math.max(0,ca);
      const nose=.17*Math.exp(-Math.pow((v-.52)*13.0,2.0))*pow(front,10.0);
      const brow=.07*Math.exp(-Math.pow((v-.62)*16.0,2.0))*pow(front,6.0);
      const chin=.08*Math.exp(-Math.pow((v-.28)*13.0,2.0))*pow(front,5.0);
      rz+=nose+brow+chin;
      rx*=1.0-.05*Math.exp(-Math.pow((v-.48)*10.0,2.0))*pow(front,8.0);
    }else{
      rx=.95*(.97+.035*Math.sin(v*8.0)+.018*Math.sin(v*19.0));
      rz=.30*(.96+.045*Math.sin(v*9.0)+.018*Math.sin(v*17.0));
      const sag=.035*Math.cos((v-.5)*Math.PI*2.0);
      rz+=sag;
    }
    const rough=.018*Math.sin(a*11.0+y*8.0)+.010*Math.sin(a*23.0-y*15.0)+.006*Math.sin(a*47.0+y*31.0);
    return [sa*(rx+rough),y,ca*(rz+rough)];
  }
  function pow(v,p){return Math.pow(v,p)}
  for(let y=0;y<=rings;y++){
    const v=y/rings;
    for(let x=0;x<seg;x++){
      const a=x/seg*Math.PI*2;
      const P=profile(v,a); verts.push(...P);
      const eps=.0025;
      const P1=profile(Math.min(1,v+eps),a), P2=profile(v,a+eps);
      const ux=P1[0]-P[0],uy=P1[1]-P[1],uz=P1[2]-P[2];
      const vx=P2[0]-P[0],vy=P2[1]-P[1],vz=P2[2]-P[2];
      let nx=uy*vz-uz*vy, ny=uz*vx-ux*vz, nz=ux*vy-uy*vx;
      const nl=Math.hypot(nx,ny,nz)||1; nx/=nl;ny/=nl;nz/=nl;
      if(nx*P[0]+nz*P[2]<0){nx=-nx;ny=-ny;nz=-nz}
      norms.push(nx,ny,nz);
    }
  }
  for(let y=0;y<rings;y++)for(let x=0;x<seg;x++){
    const a=y*seg+x,b=y*seg+(x+1)%seg,c=(y+1)*seg+x,d=(y+1)*seg+(x+1)%seg;
    inds.push(a,c,b,b,c,d);
  }

  const buf=(data,target,type)=>{const b=gl.createBuffer();gl.bindBuffer(target,b);gl.bufferData(target,new type(data),gl.STATIC_DRAW);return b};
  const pb=buf(verts,gl.ARRAY_BUFFER,Float32Array), nb=buf(norms,gl.ARRAY_BUFFER,Float32Array), ib=buf(inds,gl.ELEMENT_ARRAY_BUFFER,Uint16Array);
  const bind=(name,b)=>{const l=gl.getAttribLocation(pr,name);gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.vertexAttribPointer(l,3,gl.FLOAT,false,0,0);gl.enableVertexAttribArray(l)};
  bind('p',pb);bind('n',nb);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);

  const um=gl.getUniformLocation(pr,'m'), ut=gl.getUniformLocation(pr,'t'), up=gl.getUniformLocation(pr,'play'), uk=gl.getUniformLocation(pr,'kind');
  let rot=.28, tilt=-.10, drag=false, px=0,py=0, zoom=1;
  const mat=(r,x)=>{
    const c=Math.cos(r),s=Math.sin(r),cx=Math.cos(x),sx=Math.sin(x);
    const base=(kind==='blarney'?.76:.82)*zoom;
    const yscale=(kind==='blarney'? .76: .82)*zoom;
    return new Float32Array([c*base,s*sx*base,s*cx*base,0,0,cx*yscale,-sx*yscale,0,-s*base,c*sx*base,c*cx*base,0,0,0,.32,1]);
  };
  const resize=()=>{
    const d=Math.min(devicePixelRatio||1,2.25),w=Math.max(1,canvas.clientWidth*d),h=Math.max(1,canvas.clientHeight*d);
    if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h)}
  };
  canvas.addEventListener('pointerdown',e=>{drag=true;px=e.clientX;py=e.clientY;canvas.setPointerCapture(e.pointerId)});
  canvas.addEventListener('pointermove',e=>{if(!drag)return;rot+=(e.clientX-px)*.008;tilt=Math.max(-.65,Math.min(.5,tilt+(e.clientY-py)*.005));px=e.clientX;py=e.clientY});
  canvas.addEventListener('pointerup',e=>{drag=false;try{canvas.releasePointerCapture(e.pointerId)}catch{}});
  canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=Math.max(.82,Math.min(1.18,zoom-e.deltaY*.0008))},{passive:false});

  const start=performance.now();
  function frame(now){
    resize();gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);gl.cullFace(gl.BACK);
    if(!drag)rot+=document.body.classList.contains('is-playing')?.0011:.00065;
    gl.uniformMatrix4fv(um,false,mat(rot,tilt));
    gl.uniform1f(ut,(now-start)/1000);gl.uniform1f(up,document.body.classList.contains('is-playing')?1:0);gl.uniform1f(uk,kind==='blarney'?1:0);
    gl.drawElements(gl.TRIANGLES,inds.length,gl.UNSIGNED_SHORT,0);requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame);
})();
