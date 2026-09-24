/**
 * GLSL (ES 3.00) for the engine's passes. Raw programs: every uniform is ours
 * (camera matrices from lib/landing/engine/camera.ts), three only compiles
 * and draws them.
 *
 * A. SURFACE + GLYPH → a G-buffer: colour (machined metal, lit by an analytic
 *    studio: a key softbox top-left, a top strip, a fill, a floor bounce and
 *    a rim in the halo's colour — no environment map), and data (normal,
 *    part id). The dial's glyphs are unlit light.
 * C. COMPOSITE → the canvas: per pixel, machined or ink (the scan / develop
 *    split), ink = three-tone paper fill + Sobel edges on depth, normal and
 *    part id; plus the halo, the smoked glass and ghosting. Premultiplied.
 * D. HIDDEN → occluded feature edges, dashed, in ink only.
 *
 * Part ids: module × 32 + kind. Kinds follow geometry MAT (0 body … 9 core),
 * then 10 glyph (never outlined) and 11 a cut face (hatched).
 */

const HEAD = /* glsl */ `precision highp float;precision highp int;`;

export const SURFACE_VS = /* glsl */ `${HEAD}
in vec3 position;in vec3 normal;in vec4 extra;
uniform mat4 uProj;uniform mat4 uView;uniform mat4 uModel;uniform float uRotor[7];uniform vec2 uClampZ;
out vec3 vN;out vec3 vV;out vec3 vL;out vec3 vW;out vec4 vX;
void main(){
  float a=uRotor[int(extra.w+.5)];mat2 r=mat2(cos(a),sin(a),-sin(a),cos(a));
  vec3 p=vec3(r*position.xy,clamp(position.z,uClampZ.x,uClampZ.y));
  vL=p;vX=extra;
  vec4 w=uModel*vec4(p,1.);vW=w.xyz;
  vec4 v=uView*w;vV=v.xyz;
  vN=mat3(uView)*(mat3(uModel)*vec3(r*normal.xy,normal.z));
  gl_Position=uProj*v;
}`;

export const SURFACE_FS = /* glsl */ `${HEAD}
in vec3 vN;in vec3 vV;in vec3 vL;in vec3 vW;in vec4 vX;
uniform vec3 uHue[5];uniform float uId;uniform float uCut;uniform float uCutAt;uniform vec3 uBore;
uniform float uCore;uniform float uPipe;uniform float uTime;
uniform vec3 uRimC;uniform float uRim;
layout(location=0) out vec4 oC;layout(location=1) out vec4 oD;
vec3 lin(vec3 c){return c*c;}
vec3 env(vec3 r){
  float key=smoothstep(.8,.97,dot(r,normalize(vec3(-.55,.62,.56))));
  float strip=smoothstep(.28,.4,r.y)*(1.-smoothstep(.56,.68,r.y))*smoothstep(-.7,.3,r.z);
  float fill=smoothstep(.72,.95,dot(r,normalize(vec3(.82,.1,.56))))*.32;
  float bounce=smoothstep(-.15,-.6,r.y)*.07;
  return vec3(1.,.985,.97)*(key*3.2+strip*1.15+fill+bounce+.025+.04*clamp(r.y*.5+.5,0.,1.));
}
vec3 spectrum(float t){
  vec3 a=uHue[1],b=uHue[2],c=uHue[3],d=uHue[4];t=fract(t)*4.;
  return t<1.?mix(a,b,t):t<2.?mix(b,c,t-1.):t<3.?mix(c,d,t-2.):mix(d,a,t-3.);
}
void main(){
  float kind=floor(vX.x+.5);
  if(kind==4.)discard;
  if(uBore.z>0.&&distance(gl_FragCoord.xy,uBore.xy)<uBore.z)discard;
  if(uCut>0.&&length(vL.xy)>.17){
    float d=abs(mod(atan(vL.y,vL.x)-uCutAt+3.14159265,6.2831853)-3.14159265);
    if(d<uCut){if(gl_FrontFacing)discard;kind=11.;}
  }
  vec3 n=normalize(gl_FrontFacing?vN:-vN);vec3 v=normalize(-vV);
  if(kind==11.)n=v;
  vec3 r=reflect(-v,n);vec3 L=normalize(vec3(-.55,.62,.56));
  float ndl=max(dot(n,L),0.);float wrap=clamp(dot(n,L)*.5+.5,0.,1.);
  float fres=.04+.96*pow(1.-max(dot(n,v),0.),5.);
  float hi=pow(max(dot(r,L),0.),28.);
  vec3 body=lin(vec3(.149,.153,.173));
  vec3 col;float hue=floor(vX.y+.5);float code=0.;
  if(kind==1.){col=env(r)*lin(vec3(.84,.843,.863))*1.05+hi*1.6;}
  else if(kind==2.){col=lin(vec3(.078,.082,.094))*(.3+wrap)+env(r)*.22+pow(max(dot(r,L),0.),60.)*.9;}
  else if(kind==3.){col=lin(vec3(.043,.047,.055))*(.5+wrap)+env(r)*.05;}
  else if(kind==5.){
    vec3 h=hue>4.5?spectrum(vL.z*.18+uTime*.03):uHue[int(clamp(hue,0.,4.))];
    col=h*(.35+1.25*uPipe)+env(r)*.08;code=(min(hue,5.)+1.)/8.;
  }
  else if(kind==6.){
    float t=atan(vL.y,vL.x);float k=sin(t*140.+vL.z*95.)*sin(t*140.-vL.z*95.);
    col=body*(.35+.9*ndl)+env(r)*(.1+.28*smoothstep(-.2,.9,k))+hi*.4;
  }
  else if(kind==7.){col=body*.35*(.4+wrap);}
  else if(kind==8.){col=lin(vec3(.02,.02,.024));}
  else if(kind==9.){col=uHue[1]*(.25+1.5*uCore)*(.55+.45*wrap)+env(r)*.15;code=2./8.;}
  else if(kind==11.){col=lin(vec3(.2,.205,.22))*(.8+.2*wrap);}
  else{col=body*(.35+1.1*ndl)+env(r)*(.14+.4*fres)+hi*.45;}
  if(kind==0.||kind==1.||kind==6.)col+=uRimC*pow(1.-max(dot(n,v),0.),5.)*uRim*.35;
  oC=vec4(pow(max(col,0.),vec3(1./2.2)),code);
  oD=vec4(n*.5+.5,(uId*32.+kind)/255.);
}`;

export const GLYPH_VS = /* glsl */ `${HEAD}
in vec3 position;in vec3 normal;in vec4 extra;
uniform mat4 uProj;uniform mat4 uView;uniform mat4 uModel;uniform float uSpin;uniform float uWave;uniform float uTime;
out vec4 vX;out vec2 vP;
void main(){
  vec3 p=position;
  if(floor(extra.x+.5)==7.){
    float i=extra.z;float e=1.-pow(abs(i*2.-1.),2.)*.6;
    float s=abs(sin(uTime*2.1+i*17.)*sin(uTime*.73+i*5.3));
    p.y*=.02+uWave*(.18+.82*s)*.42*e;
  }else{float a=uSpin;p.xy=mat2(cos(a),sin(a),-sin(a),cos(a))*p.xy;}
  vP=p.xy;vX=extra;
  gl_Position=uProj*uView*uModel*vec4(p,1.);
}`;

export const GLYPH_FS = /* glsl */ `${HEAD}
in vec4 vX;in vec2 vP;
uniform vec3 uHue[5];uniform float uArcs[5];uniform float uDraw;uniform float uPower;uniform vec3 uBore;
layout(location=0) out vec4 oC;layout(location=1) out vec4 oD;
void main(){
  float kind=floor(vX.x+.5);
  if(uBore.z>0.&&distance(gl_FragCoord.xy,uBore.xy)<uBore.z)discard;
  vec3 col;float code=0.;
  if(kind<=1.){if(vX.z>uDraw)discard;col=vec3(kind==1.?.5:.26);}
  else if(kind==2.){
    if(vX.z>uDraw)discard;int h=int(floor(vX.y+.5));
    col=uHue[h]*(.12+.88*uArcs[h])*(.3+.7*uPower);code=(vX.y+1.)/8.;
  }
  else if(kind==3.){if(fract(vX.z*90.)>.5)discard;col=vec3(.14);}
  else if(kind==4.){col=vec3(.2);}
  else if(kind==5.){col=uHue[0];code=1./8.;}
  else if(kind==6.){col=uHue[0]*uPower;code=1./8.;}
  else{col=mix(vec3(.4),uHue[0],.65)*uPower;code=1./8.;}
  oC=vec4(pow(col,vec3(1./2.2)),code);
  oD=vec4(.5,.5,1.,10./255.);
}`;

export const QUAD_VS = /* glsl */ `${HEAD}
in vec3 position;
void main(){gl_Position=vec4(position.xy,0.,1.);}`;

export const COMPOSITE_FS = /* glsl */ `${HEAD}
uniform sampler2D tC;uniform sampler2D tD;uniform sampler2D tZ;
uniform vec2 uRes;uniform float uPx;uniform vec4 uSplit;uniform vec2 uInk;
uniform vec3 uPaper[3];uniform vec3 uInkC;uniform vec3 uDeep[5];
uniform vec4 uHalo;uniform vec3 uHaloC;uniform vec4 uGlass;uniform float uGhost[6];uniform vec2 uNF;
out vec4 oF;
float lin(float d){float z=d*2.-1.;return 2.*uNF.x*uNF.y/(uNF.y+uNF.x-z*(uNF.y-uNF.x));}
vec2 edges(vec2 p,float w,float d0,vec3 n0,float id0){
  float outl=0.,feat=0.;bool c0=d0<1.;float z0=c0?lin(d0):0.;
  for(int i=0;i<8;i++){
    float a=float(i)*.785398;vec2 q=(p+vec2(cos(a),sin(a))*w)/uRes;
    float d=texture(tZ,q).r;bool c=d<1.;
    if(c!=c0){outl=1.;continue;}
    if(!c0)continue;
    vec4 D=texture(tD,q);float id=floor(D.a*255.+.5);
    if(abs(lin(d)-z0)>.06*z0)outl=max(outl,.9);
    if(mod(id,32.)==10.&&mod(id0,32.)==10.)continue;
    if(id!=id0)feat=1.;
    if(dot(D.rgb*2.-1.,n0)<.82)feat=max(feat,.8);
  }
  return vec2(outl,feat);
}
void main(){
  vec2 p=gl_FragCoord.xy;vec2 uv=p/uRes;float yTop=uRes.y-p.y;
  float d0=texture(tZ,uv).r;bool cov=d0<1.;
  vec4 C=texture(tC,uv);vec4 D=texture(tD,uv);
  vec3 n=D.rgb*2.-1.;float id=floor(D.a*255.+.5);float kind=mod(id,32.);int mo=int(floor(id/32.));
  bool inA=uSplit.x==1.?yTop<uSplit.y:uSplit.x==2.?distance(vec2(p.x,yTop),uSplit.yz)<uSplit.w:true;
  float ink=inA?uInk.x:uInk.y;
  vec2 e1=edges(p,uPx*(1.+.75*ink),d0,n,id);
  vec3 mach=C.rgb;
  if(cov&&kind!=10.)mach=mix(mach,vec3(0.),e1.x*.55);
  vec3 L=normalize(vec3(-.55,.62,.56));float ndl=dot(n,L);
  vec3 fill=mix(uPaper[2],mix(uPaper[1],uPaper[0],smoothstep(.35,.55,ndl)),smoothstep(-.2,0.,ndl));
  float code=floor(C.a*8.+.5)-1.;
  if(kind==10.)fill=code>=0.&&code<5.?uDeep[int(code)]:uInkC;
  else if(kind==5.&&code>=0.&&code<5.)fill=mix(fill,uDeep[int(code)],.75);
  else if(kind==11.){float h=step(.55,fract((p.x+p.y)/(5.*uPx)));fill=mix(uPaper[1],uInkC,h*.55);}
  float line=max(e1.x,e1.y*.85);
  vec3 inkC=mix(fill,uInkC,line);
  vec3 col=mix(mach,inkC,ink);
  float a=cov?1.:0.;
  if(!cov&&e1.x>0.){a=e1.x*ink;col=uInkC;}
  if(cov&&mo<6)a*=1.-uGhost[mo]*.85;
  if(cov&&mo==0&&uGlass.w>0.){
    vec2 g=vec2(p.x,yTop)-uGlass.xy;float r=length(g)/uGlass.z;
    if(r<1.){
      float face=smoothstep(.55,.95,n.z);
      float streak=(smoothstep(.2,.0,abs((g.x+g.y)/uGlass.z+.35))*.07+smoothstep(.12,0.,abs((g.x+g.y)/uGlass.z+.62))*.035)*face;
      float dark=kind==10.?.15:.45;
      col=mix(col,col*(1.-dark*uGlass.w)+streak,1.-ink);
    }
  }
  if(!cov&&ink<1.&&uHalo.w>0.){
    float r=distance(vec2(p.x,yTop),uHalo.xy)/uHalo.z;float h=exp(-r*r*1.6)*uHalo.w*(1.-ink);
    col=mix(col,uHaloC,step(a,0.));a=max(a,h);
  }
  oF=vec4(col*a,a);
}`;

export const HIDDEN_VS = /* glsl */ `${HEAD}
in vec3 position;
uniform mat4 uProj;uniform mat4 uView;uniform mat4 uModel;
out float vS;
void main(){vS=atan(position.y,position.x)*length(position.xy)+position.z;gl_Position=uProj*uView*uModel*vec4(position,1.);}`;

export const HIDDEN_FS = /* glsl */ `${HEAD}
in float vS;
uniform sampler2D tZ;uniform vec2 uRes;uniform vec3 uInkC;uniform float uAlpha;uniform vec4 uSplit;uniform vec2 uInk;
out vec4 oF;
void main(){
  vec2 p=gl_FragCoord.xy;float yTop=uRes.y-p.y;
  if(gl_FragCoord.z<=texture(tZ,p/uRes).r+.00002)discard;
  if(fract(vS*5.)>.55)discard;
  bool inA=uSplit.x==1.?yTop<uSplit.y:uSplit.x==2.?distance(vec2(p.x,yTop),uSplit.yz)<uSplit.w:true;
  float a=uAlpha*(inA?uInk.x:uInk.y);
  if(a<=0.)discard;
  oF=vec4(uInkC*a,a);
}`;
