// Create an empty scene
let scene = new THREE.Scene();

// Create a basic perspective camera
let camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.x = 200;

// Create a renderer with Antialiasing
let renderer = new THREE.WebGLRenderer({ antialias: true });

// Configure renderer clear color
renderer.setClearColor('#000000');

// Configure renderer size
renderer.setSize(window.innerWidth, window.innerHeight);

// Append Renderer to DOM
document.body.appendChild(renderer.domElement);

let colors = [];

//Add Milky Way with a special magenta color
let dotGeometry = new THREE.Geometry();
dotGeometry.vertices.push(new THREE.Vector3(0, 0, 0));
colors.push(new THREE.Color('#f0f'));

let rawFile = new XMLHttpRequest();
rawFile.open('GET', 'galaxydata.txt', false);
rawFile.onreadystatechange = function () {
    if (rawFile.readyState === 4) {
        if (rawFile.status === 200 || rawFile.status == 0) {
            let data = rawFile.responseText.split('\n');

            for (let i = 0; i < 4672; i++) {
                let parts = data[i].split(' ');
                dotGeometry.vertices.push(
                    new THREE.Vector3(parseFloat(parts[0]), parseFloat(parts[1]), parseFloat(parts[2]))
                );
                colors.push(new THREE.Color('#fff'));
            }
        }
    }
};
rawFile.send(null);

let names;
rawFile = new XMLHttpRequest();
rawFile.open('GET', 'galaxyname.txt', false);
rawFile.onreadystatechange = function () {
    if (rawFile.readyState === 4) {
        if (rawFile.status === 200 || rawFile.status == 0) {
            allText = rawFile.responseText;
            names = allText.split('\n');
        }
    }
};
rawFile.send(null);

dotGeometry.colors = colors;

let size = 0.0268;
let dotMaterial = new THREE.PointsMaterial({
    size: size,
    vertexColors: THREE.VertexColors
});
let dots = new THREE.Points(dotGeometry, dotMaterial);
scene.add(dots);

let controls = new THREE.TrackballControls(camera, renderer.domElement);

// Render Loop
let render = function () {
    requestAnimationFrame(render);
    controls.update();
    // Render the scene
    renderer.render(scene, camera);
    TWEEN.update();
};

render();

window.addEventListener('resize', onWindowResize, false);
window.addEventListener('mousemove', onDocumentMouseMove, false);
window.addEventListener('click', onDocumentMouseClick, false);
window.addEventListener('contextmenu', onDocumentMouseRightClick, false);
window.addEventListener('wheel', onDocumentMouseWheel, true);

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

let centerindex = 0; // central galaxy
let centerdist = document.getElementById('centerdist');
let centerdistval = 200;
let startstring = document.getElementById('startstring');
let selectedObject = -1;
let clickedObject = -1;
let rclickedObject = -1;

function onDocumentMouseWheel() {
    updateCenterGUI();
}

document.getElementById('srchkey').addEventListener('keyup', function (event) {
    event.preventDefault();
    if (event.keyCode === 13) document.getElementById('srchbtn').click();
});

function searchfunc() {
    let srchkey = document.getElementById('srchkey').value;
    if (srchkey == '') return;
    let key = srchkey.replace(/[^A-Z0-9]/gi, '').toLowerCase();
    if (key == 'milkyway') {
        updateGalaxyPage(0);
        updateCenterGUI();
    } else {
        let found = false;
        for (let i = 0; i < 4673; i++) {
            let name = names[i];
            if (name.indexOf(',') > -1) {
                let namearr = name.split(',');
                for (let j = 0; j < namearr.length; j++) {
                    if (namearr[j].replace(/[^A-Z0-9]/gi, '').toLowerCase() == key) {
                        found = true;
                        break;
                    }
                }
                if (found) {
                    if (centerindex !== i)
                        dots.geometry.colors[centerindex] =
                            centerindex === 0 ? new THREE.Color('#f0f') : new THREE.Color('#fff');
                    centerindex = i;

                    updateGalaxyPage(i);
                    updateCenterGUI();
                    break;
                }
            } else {
                if (name.replace(/[^A-Z0-9]/gi, '').toLowerCase() == key) {
                    updateGalaxyPage(i);
                    found = true;
                    break;
                }
            }
        }
        if (!found) alert(srchkey + ' not found. Yes, we know we need to improve our search 😊');
    }
}

function onDocumentMouseMove(event) {
    event.preventDefault();
    if (selectedObject >= 0) {
        if (selectedObject === 0) dots.geometry.colors[0] = new THREE.Color('#f0f');
        else if (selectedObject === clickedObject) dots.geometry.colors[selectedObject] = new THREE.Color('#ff0');
        else if (selectedObject === rclickedObject) dots.geometry.colors[selectedObject] = new THREE.Color('#0f0');
        else dots.geometry.colors[selectedObject] = new THREE.Color('#fff');

        dots.geometry.colorsNeedUpdate = true;

        selectedObject = -1;
    }

    let intersects = getIntersects(event.layerX, event.layerY);
    if (intersects.length > 0) {
        let idx = intersects[0].index;
        dots.geometry.colors[idx] = new THREE.Color('#69f');
        dots.geometry.colorsNeedUpdate = true;
        selectedObject = idx;
    }
}

function onDocumentMouseClick(event) {
    let intersects = getIntersects(event.layerX, event.layerY);
    if (intersects.length > 0) {
        let idx = intersects[0].index;
        if (centerindex !== idx)
            dots.geometry.colors[centerindex] = centerindex === 0 ? new THREE.Color('#f0f') : new THREE.Color('#fff');

        if (idx) updateGalaxyPage(idx);
        else updateGalaxyPage(0);

        dots.geometry.colorsNeedUpdate = true;
        clickedObject = idx;
        centerindex = idx;
        updateCenterGUI();
    }
}

function onDocumentMouseRightClick(event) {
    let intersects = getIntersects(event.layerX, event.layerY);
    if (intersects.length > 0) {
        let idx = intersects[0].index;
        if (idx) dots.geometry.colors[idx] = new THREE.Color('#0f0');
        else dots.geometry.colors[idx] = new THREE.Color('#f0f');
        dots.geometry.colorsNeedUpdate = true;
        rclickedObject = idx;
    }
}

let raycaster = new THREE.Raycaster();
raycaster.params.Points.threshold = size * 0.5;
let mouseVector = new THREE.Vector3();

function getIntersects(x, y) {
    x = (x / window.innerWidth) * 2 - 1;
    y = -(y / window.innerHeight) * 2 + 1;

    mouseVector.set(x, y, 0.5);
    raycaster.setFromCamera(mouseVector, camera);

    return raycaster.intersectObject(dots, true);
}
let galaxyName = document.getElementById('galaxyName');
let galaxyName2 = document.getElementById('galaxyName2');
let galaxyNames = document.getElementById('galaxyNames');
let galaxyDist = document.getElementById('galaxyDist');

let galaxyColor = document.getElementById('galaxyColor');
let image = document.getElementById('image');

let cdsLink = document.getElementById('cds');
let simbad = document.getElementById('simbad');
let aladinLink = document.getElementById('aladin');
let ned = document.getElementById('ned');

let aladinDiv = document.getElementById('aladin-lite-div');
function updateGalaxyPage(i) {
    let name = names[i];

    if (i === 0) {
        galaxyName.innerText = 'Milky Way';
        galaxyName2.innerText = 'Milky Way';
        galaxyNames.innerText = 'Milky Way';

        galaxyColor.style.color = '#f0f';
        galaxyColor.innerText = 'magenta';

        if (typeof A !== 'undefined') {
            if (aladinDiv.style.display === 'none') aladinDiv.style.display = 'block';
            if (image.style.display === 'block') image.style.display = 'none';
            A.aladin('#aladin-lite-div', { target: '266.4 -29', fov: 60, showLayersControl: false, showGotoControl: false });
        } else
            image.src =
                'https://upload.wikimedia.org/wikipedia/commons/thumb/4/43/ESO-VLT-Laser-phot-33a-07.jpg/1280px-ESO-VLT-Laser-phot-33a-07.jpg';

        if (cdsLink.style.display === 'block') cdsLink.style.display = 'none';
        if (simbad.style.display === 'block') simbad.style.display = 'none';
        if (aladinLink.style.display === 'block') aladinLink.style.display = 'none';
        if (ned.style.display === 'block') ned.style.display = 'none';
    } else {
        dots.geometry.colors[i] = new THREE.Color('#ff0');

        galaxyColor.style.color = '#ff0';
        galaxyColor.innerText = 'yellow';

        let firstname = name.split(',')[0];

        galaxyName.innerText = firstname;
        galaxyName2.innerText = firstname;
        galaxyNames.innerText = name;

        if (cdsLink.style.display === 'none') cdsLink.style.display = 'block';
        if (simbad.style.display === 'none') simbad.style.display = 'block';
        if (aladinLink.style.display === 'none') aladinLink.style.display = 'block';
        if (ned.style.display === 'none') ned.style.display = 'block';

        cdsLink.href = `http://cdsportal.u-strasbg.fr/?target=${firstname}`;
        simbad.href = `http://simbad.u-strasbg.fr/simbad/sim-id?Ident=${firstname}`;
        aladinLink.href = `https://aladin.u-strasbg.fr/AladinLite/?target=${firstname}`;
        ned.href = `https://ned.ipac.caltech.edu/cgi-bin/objsearch?extend=no&hconst=73&omegam=0.27&omegav=0.73&corr_z=1&out_csys=Equatorial&out_equinox=J2000.0&obj_sort=RA+or+Longitude&of=pre_text&zv_breaker=30000.0&list_limit=5&img_stamp=YES&objname=${firstname}`;

        if (typeof A !== 'undefined') {
            if (aladinDiv.style.display === 'none') aladinDiv.style.display = 'block';
            if (image.style.display === 'block') image.style.display = 'none';

            let d = dots.geometry.vertices[i].length(); // distance
            let fov = 1;
            fov /= d / 2;
            if (fov > 1) fov = 1;

            A.aladin('#aladin-lite-div', { target: firstname, fov, showLayersControl: false, showGotoControl: false });
        } else {
            image.src = `http://alasky.u-strasbg.fr/cgi/simbad-thumbnails/get-thumbnail.py?name=${firstname}`;
        }
    }

    let from = controls.target;
    let to = dots.geometry.vertices[i];

    let galaxyDistance = to.length();
    galaxyDist.innerText = `Distance from Earth: ${galaxyDistance.toFixed(1)} Mpc (${(3.262 * galaxyDistance).toFixed(1)} Mly)`;

    TWEEN.removeAll();
    let tween = new TWEEN.Tween(from)
        .to(to, 750)
        .easing(TWEEN.Easing.Linear.None)
        .onUpdate(function (p) {
            camera.lookAt(p);
        });

    tween.start();

    dots.geometry.colorsNeedUpdate = true;
    clickedObject = i;
}
function updateCenterGUI() {
    let cameraloc = camera.position;
    centerdistval = cameraloc.distanceTo(dots.geometry.vertices[centerindex]);
    centerdist.innerHTML = centerdistval.toFixed(2);
    centerdistly.innerHTML = (3.262 * centerdistval).toFixed(2);
}
