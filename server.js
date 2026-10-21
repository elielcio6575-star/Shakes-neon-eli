const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const crypto = require('crypto');
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
const PORT = process.env.PORT || 3000;
app.use(express.static('public'));
app.get('/health', (_, res) => res.json({ ok: true }));

const rooms = new Map();
const N = 30;
const directions = { up:{x:0,y:-1}, down:{x:0,y:1}, left:{x:-1,y:0}, right:{x:1,y:0} };
const starts = [
  {x:5,y:5,dir:'right'}, {x:24,y:24,dir:'left'}, {x:24,y:5,dir:'down'}
];
function code(){ return crypto.randomBytes(3).toString('hex').slice(0,6).toUpperCase(); }
function randCell(){return {x:Math.floor(Math.random()*N),y:Math.floor(Math.random()*N)}}
function occupied(r,p){return r.snakes.some(s=>s.alive&&s.body.some(b=>b.x===p.x&&b.y===p.y))||r.foods.some(f=>f.x===p.x&&f.y===p.y)||(r.star&&r.star.x===p.x&&r.star.y===p.y)}
function freeCell(r){for(let i=0;i<500;i++){const p=randCell();if(!occupied(r,p))return p}return randCell()}
function publish(r){const payload={code:r.code,players:r.players.map(p=>({id:p.id,name:p.name})),started:r.started,snakes:r.snakes,foods:r.foods,star:r.star?{x:r.star.x,y:r.star.y}:null,winner:r.winner};io.to(r.code).emit('gameState',payload);io.to(r.code).emit('roomUpdate',{players:r.players.map(p=>({id:p.id,name:p.name}))})}
function makeGame(r){r.snakes=r.players.map(p=>{let a=starts[p.id],d=directions[a.dir];return {id:p.id,name:p.name,body:[{x:a.x,y:a.y},{x:a.x-d.x,y:a.y-d.y},{x:a.x-2*d.x,y:a.y-2*d.y}],dir:a.dir,next:a.dir,score:0,alive:true,powerMs:0}});r.foods=[];r.star=null;r.foodsEaten=0;r.started=true;r.winner=null;for(let i=0;i<5;i++)r.foods.push(freeCell(r));r.last=Date.now()}
function tick(r){if(!r.started)return;let now=Date.now(),dt=Math.min(200,now-r.last);r.last=now;
 for(const s of r.snakes)if(s.alive){s.dir=s.next;let d=directions[s.dir],h=s.body[0];s.body.unshift({x:h.x+d.x,y:h.y+d.y})}
 for(const s of r.snakes){if(!s.alive)continue;let h=s.body[0],fi=r.foods.findIndex(f=>f.x===h.x&&f.y===h.y);if(fi>=0){s.score++;r.foods.splice(fi,1);r.foods.push(freeCell(r));r.foodsEaten++;if(r.foodsEaten%10===0&&!r.star){r.star={x:Math.floor(N/2),y:Math.floor(N/2)};io.to(r.code).emit('notice','✦ Estrela neon no centro do mapa! Corram para pegá-la!')}}else s.body.pop()}
 for(const s of r.snakes){if(!s.alive)continue;let h=s.body[0];if(h.x<0||h.y<0||h.x>=N||h.y>=N||s.body.slice(1).some(p=>p.x===h.x&&p.y===h.y)){s.alive=false;continue}
 const colliders=r.snakes.filter(o=>o!==s&&o.alive&&o.body.some(p=>p.x===h.x&&p.y===h.y));if(colliders.length&&s.powerMs<=0)s.alive=false}
 if(r.star){for(const s of r.snakes){if(s.alive&&s.body[0].x===r.star.x&&s.body[0].y===r.star.y){r.star=null;s.powerMs=5000;io.to(r.code).emit('notice',`✦ ${s.name} pegou a estrela! Poder por 5 segundos!`);break}}}
 for(const s of r.snakes){if(s.powerMs>0){s.powerMs=Math.max(0,s.powerMs-dt);s.drain=(s.drain||0)+dt;if(s.drain>=1000){s.drain-=1000;for(const o of r.snakes){if(o!==s&&o.alive&&o.score>0){o.score--;s.score++}}}}}
 const alive=r.snakes.filter(s=>s.alive);if(alive.length<=1){r.started=false;r.winner=alive.length?alive[0].id+1:null;io.to(r.code).emit('notice',r.winner?`🏆 ${alive[0].name} venceu!`:'Todas as cobras foram eliminadas.')}
 publish(r)}
io.on('connection',socket=>{
 socket.on('createRoom',({name})=>{let c;do{c=code()}while(rooms.has(c));let r={code:c,host:socket.id,players:[],snakes:[],foods:[],star:null,started:false,winner:null};rooms.set(c,r);join(socket,r,name);socket.emit('room',{code:c,playerId:0,host:true,players:r.players});});
 socket.on('joinRoom',({code,name})=>{let r=rooms.get(String(code||'').toUpperCase());if(!r)return socket.emit('errorMsg','Sala não encontrada. Confira o código.');if(r.players.length>=3)return socket.emit('errorMsg','A sala já está cheia (3 jogadores).');if(r.started)return socket.emit('errorMsg','A partida já começou. Entre na próxima rodada.');join(socket,r,name);socket.emit('room',{code:r.code,playerId:r.players[r.players.length-1].id,host:false,players:r.players});io.to(r.code).emit('notice',`${name||'Jogador'} entrou na sala.`);});
 function join(socket,r,name){let id=[0,1,2].find(i=>!r.players.some(p=>p.id===i));if(id===undefined)return;let p={id,name:String(name||'Jogador').slice(0,16),socketId:socket.id};r.players.push(p);socket.join(r.code);socket.data.room=r.code;socket.data.playerId=id;io.to(r.code).emit('roomUpdate',{players:r.players.map(p=>({id:p.id,name:p.name}))})}
 socket.on('startGame',()=>{let r=rooms.get(socket.data.room);if(!r||r.host!==socket.id)return;if(!r.players.length)return;makeGame(r);io.to(r.code).emit('notice','Partida iniciada! Comam e sobrevivam.');publish(r)});
 socket.on('turn',d=>{let r=rooms.get(socket.data.room);if(!r||!r.started||!directions[d])return;let s=r.snakes.find(x=>x.id===socket.data.playerId);if(!s||!s.alive)return;let a=directions[s.dir],b=directions[d];if(a.x+b.x===0&&a.y+b.y===0)return;s.next=d});
 socket.on('disconnect',()=>{let r=rooms.get(socket.data.room);if(!r)return;r.players=r.players.filter(p=>p.socketId!==socket.id);if(!r.players.length){rooms.delete(r.code);return}if(r.host===socket.id)r.host=r.players[0].socketId;io.to(r.code).emit('notice','Um jogador desconectou.');publish(r)});
});
setInterval(()=>{for(const r of rooms.values())tick(r)},100);
server.listen(PORT,()=>console.log(`Neon Snake Online listening on ${PORT}`));
