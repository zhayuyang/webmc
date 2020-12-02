// Generated by CoffeeScript 2.5.1
var FPC, al, animate, camera, canvas, cursor, init, inv_bar, materials, parameters, params, playerObject, render, renderer, scene, socket, stats, worker, world;

scene = null;

materials = null;

parameters = null;

canvas = null;

renderer = null;

camera = null;

world = null;

cursor = null;

FPC = null;

socket = null;

stats = null;

worker = null;

playerObject = null;

inv_bar = null;

params = null;

import * as THREE from './build/three.module.js';

import {
  SkeletonUtils
} from './jsm/utils/SkeletonUtils.js';

import Stats from './jsm/libs/stats.module.js';

import {
  World
} from './World/World.js';

import {
  FirstPersonControls
} from './FirstPersonControls.js';

import {
  gpuInfo
} from './gpuInfo.js';

import {
  AssetLoader
} from './AssetLoader.js';

import {
  InventoryBar
} from './InventoryBar.js';

import {
  RandomNick
} from './RandomNick.js';

import {
  GUI
} from './jsm/libs/dat.gui.module.js';

import {
  Chat
} from './Chat.js';

import {
  Entities
} from './Entities.js';

init = function() {
  var ambientLight, chat, color, directionalLight, ent, eventMap, far, gui, i, near, nick;
  //Płótno,renderer,scena i kamera
  canvas = document.querySelector('#c');
  renderer = new THREE.WebGLRenderer({
    canvas,
    PixelRatio: window.devicePixelRatio
  });
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(70, 2, 0.1, 1000);
  camera.rotation.order = "YXZ";
  camera.position.set(26, 26, 26);
  //Skybox
  scene.background = new THREE.Color("#adc8ff");
  //Światła
  ambientLight = new THREE.AmbientLight(0xcccccc);
  scene.add(ambientLight);
  directionalLight = new THREE.DirectionalLight(0x333333, 2);
  directionalLight.position.set(1, 1, 0.5).normalize();
  scene.add(directionalLight);
  //Informacja o gpu komputera
  console.warn(gpuInfo());
  //Nick gracza
  nick = document.location.hash.substring(1, document.location.hash.length);
  if (nick === "") {
    nick = RandomNick();
    document.location.href = `\#${nick}`;
  }
  //Moby
  ent = new Entities({scene, nick, TWEEN});
  //FPSy
  stats = new Stats();
  stats.showPanel(0);
  document.body.appendChild(stats.dom);
  //Utworzenie klasy świat
  world = new World({
    toxelSize: 27,
    cellSize: 16,
    scene,
    camera,
    al
  });
  //Połączenie z serwerem i kontrolki gracza
  socket = io.connect(`${document.location.host}`);
  FPC = new FirstPersonControls({
    canvas,
    camera,
    micromove: 0.3,
    socket,
    TWEEN,
    fov: 70
  });
  //Czat
  chat = new Chat({FPC});
  //Utworzenie inventory
  inv_bar = new InventoryBar();
  inv_bar.listen();
  //Komunikacja z serwerem websocket
  eventMap = {
    "connect": function() {
      console.log("Połączono z serverem!");
      $('.loadingText').text("Za chwilę dołączysz do gry...");
      console.log(`User nick: 	${nick}`);
      socket.emit("initClient", {
        nick: nick
      });
    },
    "blockUpdate": function(block) {
      world.setBlock(block[0], block[1] + 16, block[2], block[3]);
    },
    "spawn": function(yaw, pitch) {
      console.log("Gracz dołączył do gry!");
      $(".initLoading").css("display", "none");
      camera.rotation.y = yaw;
      camera.rotation.x = pitch;
    },
    "mapChunk": function(sections, x, z, biomes) {
      world._computeSections(sections, x, z, biomes);
    },
    "hp": function(points) {
      inv_bar.setHp(points);
    },
    "inventory": function(inv) {
      inv_bar.updateInv(inv);
    },
    "food": function(points) {
      inv_bar.setFood(points);
    },
    "msg": function(msg) {
      chat.log(msg);
    },
    "kicked": function(reason) {
      chat.log("You have been kicked!");
    },
    "xp": function(xp) {
      inv_bar.setXp(xp.level, xp.progress);
    },
    "move": function(pos) {
      var to;
      to = {
        x: pos.x - 0.5,
        y: pos.y + 17,
        z: pos.z - 0.5
      };
      new TWEEN.Tween(camera.position).to(to, 100).easing(TWEEN.Easing.Quadratic.Out).start();
    },
    "entities": function(entities) {
      return ent.update(entities);
    }
  };
  for (i in eventMap) {
    socket.on(i, eventMap[i]);
  }
  //Kursor raycastowania
  cursor = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), new THREE.LineBasicMaterial({
    color: 0x000000,
    linewidth: 0.5
  }));
  scene.add(cursor);
  //Interfejs dat.gui
  gui = new GUI();
  params = {
    fog: true,
    chunkdist: 3
  };
  color = new THREE.Color("#adc8ff");
  near = 0.5 * 16;
  far = 3 * 16;
  scene.fog = new THREE.Fog(color, near, far);
  gui.add(params, 'fog').name('Enable fog').listen().onChange(function() {
    if (params.fog) {
      //Mgła
      return scene.fog = new THREE.Fog(color, near, far);
    } else {
      return scene.fog = null;
    }
  });
  gui.add(world.material, 'wireframe').name('Wireframe').listen();
  gui.add(params, 'chunkdist', 0, 10, 1).name('Render distance').listen();
  $(document).mousedown(function(e) {
    console.log(world.cellTerrain.getBlock(...world.getRayBlock().posBreak));
  });
  //Wprawienie w ruch funkcji animate
  animate();
};

//Renderowanie
render = function() {
  var height, pos, rayBlock, width;
  //Automatyczne zmienianie rozmiaru renderera
  width = window.innerWidth;
  height = window.innerHeight;
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  //Raycastowany block
  rayBlock = world.getRayBlock();
  if (rayBlock) {
    pos = rayBlock.posBreak;
    cursor.position.set(...pos);
    cursor.visible = true;
  } else {
    cursor.visible = false;
  }
  //Updatowanie komórek wokół gracza
  world.updateCellsAroundPlayer(camera.position, params.chunkdist);
  //Updatowanie sceny i animacji TWEEN
  TWEEN.update();
  renderer.render(scene, camera);
  inv_bar.tick();
};

//Funkcja animate
animate = function() {
  try {
    stats.begin();
    render();
    stats.end();
  } catch (error) {}
  requestAnimationFrame(animate);
};

//AssetLoader
al = new AssetLoader();

$.get("assets/assetLoader.json", function(assets) {
  al.load(assets, function() {
    console.log("AssetLoader: done loading!");
    init();
  }, al);
});
