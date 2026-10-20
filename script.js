// These offsets also drive the original Blender shells in tools/render_moods.py.
const INITIAL = [88, 198, 64];
const MOODS = {
  calm: { angles: [25,155,280], title:'CALM', description:'色块向不同方向舒展，探索更开放、平静的构成。', start:0, end:4 },
  energetic: { angles: [320,15,65], title:'ENERGETIC', description:'红黄蓝聚集交错，探索更鲜明、活跃的构成。', start:4, end:10 },
  focused: { angles: [245,255,265], title:'FOCUSED', description:'三个色块趋向同一方向，探索更集中、有秩序的构成。', start:10, end:18 }
};
const sliders = [...document.querySelectorAll('input[type="range"]')];
const rings = INITIAL.map((_,i)=>document.getElementById(`ring-${i}`));
const outputs = INITIAL.map((_,i)=>document.getElementById(`value-${i}`));
const moodButtons = [...document.querySelectorAll('[data-mood]')];
const playButton = document.getElementById('play');
const video = document.getElementById('physical-video');
const filmStatus = document.getElementById('film-status');
let segmentEnd = null;
let requestId = 0;

function render(angles, mood=null) {
  angles.forEach((angle,i)=>{
    angle=Math.round(angle);
    sliders[i].value=angle; rings[i].style.transform=`rotate(${angle}deg)`;
    outputs[i].textContent=`${String(angle).padStart(3,'0')}°`;
    sliders[i].setAttribute('aria-valuetext',`${angle} 度`);
  });
  document.getElementById('stage-state').textContent=mood ? MOODS[mood].title : 'MANUAL';
  document.getElementById('mood-description').textContent=mood ? MOODS[mood].description : '自由调整角度；实体视频不会随手动滑块实时重渲染。';
  moodButtons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.mood===mood)));
}
function stopDemo() {
  requestId++;
  segmentEnd=null;
  video.pause();
  playButton.textContent='Play Demo ↗';
}
async function playFilm(time=0,end=null) {
  stopDemo();
  const token=requestId;
  segmentEnd=end;
  try {
    if(video.readyState<1) {
      await new Promise((resolve,reject)=>{
        const cleanup=()=>{video.removeEventListener('loadedmetadata',ready);video.removeEventListener('error',error);};
        const ready=()=>{cleanup();resolve();};
        const error=()=>{cleanup();reject(new Error('video unavailable'));};
        video.addEventListener('loadedmetadata',ready); video.addEventListener('error',error);
        video.load();
      });
    }
    if(token!==requestId)return;
    video.currentTime=time;
    await video.play();
    if(token!==requestId)video.pause();
  } catch(error) {
    if(token===requestId){filmStatus.textContent='视频未能播放，请使用视频控件播放或下载 MP4。';playButton.textContent='Play Demo ↗';}
  }
}
function blend(a,b,t) {
  const ease=t*t*(3-2*t);
  return a.map((value,i)=>(value+((b[i]-value+540)%360-180)*ease+360)%360);
}
function syncFilm() {
  const t=video.currentTime;
  let mood='calm', angles=MOODS.calm.angles;
  if(t>=4 && t<6){mood='energetic';angles=blend(MOODS.calm.angles,MOODS.energetic.angles,(t-4)/2);}
  else if(t>=6 && t<10){mood='energetic';angles=MOODS.energetic.angles;}
  else if(t>=10 && t<12){mood='focused';angles=blend(MOODS.energetic.angles,MOODS.focused.angles,(t-10)/2);}
  else if(t>=12){mood='focused';angles=MOODS.focused.angles;}
  render(angles,mood);
  filmStatus.textContent=`${MOODS[mood].title} · ${t.toFixed(1)} / 18 SEC · ORIGINAL 3D MODEL`;
  if(segmentEnd!==null && t>=segmentEnd-.05){segmentEnd=null;video.pause();}
}
video.addEventListener('timeupdate',syncFilm);
video.addEventListener('seeked',syncFilm);
video.addEventListener('play',()=>{document.querySelector('.stage').classList.add('adjusting');playButton.textContent='Stop Demo ■';});
video.addEventListener('pause',()=>{playButton.textContent='Play Demo ↗';document.querySelector('.stage').classList.remove('adjusting');});
video.addEventListener('ended',()=>{segmentEnd=null;playButton.textContent='Play Demo ↗';});
video.addEventListener('error',()=>{filmStatus.textContent='视频加载失败。请检查 assets/rotate-light-moods.mp4 是否存在。';});

sliders.forEach(slider=>{
  slider.addEventListener('input',()=>{stopDemo();document.querySelector('.stage').classList.add('adjusting');render(sliders.map(input=>Number(input.value)));filmStatus.textContent='MANUAL COMPOSITION · 视频保留上一帧，不随滑块实时渲染';});
  slider.addEventListener('change',()=>document.querySelector('.stage').classList.remove('adjusting'));
});
moodButtons.forEach(button=>button.addEventListener('click',()=>{
  const mood=button.dataset.mood;
  render(MOODS[mood].angles,mood);
  playFilm(MOODS[mood].start,MOODS[mood].end);
}));
document.querySelectorAll('[data-film-time]').forEach(button=>button.addEventListener('click',()=>playFilm(Number(button.dataset.filmTime))));
document.getElementById('reset').addEventListener('click',()=>{
  stopDemo();
  render(INITIAL);
  filmStatus.textContent='已重置数字构成。选择 Mood 或 Play Demo 播放模型视频。';
});
playButton.addEventListener('click',()=>{if(!video.paused)stopDemo();else playFilm(0);});
document.getElementById('demo-mode').addEventListener('click',event=>{
  const enabled=document.body.classList.toggle('demo');
  event.currentTarget.setAttribute('aria-pressed',String(enabled));
  event.currentTarget.textContent=enabled?'Exit Demo Mode':'Demo Mode';
});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopDemo();});
render(INITIAL);
