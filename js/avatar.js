import * as THREE from '/vendor/three.vendor.js';
import { GLTFLoader } from '/vendor/three.vendor.js';
import { OrbitControls } from '/vendor/three.vendor.js';

const SHIRT_MATS = new Set([
  'Material.001',
  'Material.003',
  'Material.004',
  'Material.005'
]);

const PANT_MATS = new Set([
  'Material.007',
  'Material.008'
]);

const BODY_MAT_SLOT = {
  'Material.002': 0,
  'Material.001': 1,
  'Material.003': 1,
  'Material.004': 2,
  'Material.005': 3,
  'Material.007': 4,
  'Material.008': 5
};

const TextureLoader = new THREE.TextureLoader();

const TextureCache = new Map();
const TextureInflight = new Map();

const ModelCache = new Map();
const ModelInflight = new Map();

const AccessoryCache = new Map();
const AccessoryInflight = new Map();

function B64ToBuffer(Base64) {
  const Binary = atob(Base64);
  const Bytes = new Uint8Array(Binary.length);

  for (let Index = 0; Index < Binary.length; Index++) {
    Bytes[Index] = Binary.charCodeAt(Index);
  }

  return Bytes.buffer;
}

function CachedLoad(Cache, Inflight, Key, Make) {
  if (Cache.has(Key)) {
    return Promise.resolve(Cache.get(Key));
  }

  if (Inflight.has(Key)) {
    return Inflight.get(Key);
  }

  const PromiseValue = Make().then((Value) => {
    Cache.set(Key, Value);
    Inflight.delete(Key);
    return Value;
  });

  Inflight.set(Key, PromiseValue);

  return PromiseValue;
}

function LoadTexture(ItemId) {
  return CachedLoad(
    TextureCache,
    TextureInflight,
    ItemId,
    () => new Promise((Resolve) => {
      TextureLoader.load(`/proxy/api/clothing/image/${ItemId}`, (Texture) => {
        Texture.colorSpace = THREE.SRGBColorSpace;
        Texture.flipY = false;
        Resolve(Texture);
      });
    })
  );
}

function LoadModel(Type) {
  return CachedLoad(
    ModelCache,
    ModelInflight,
    Type,
    () => new GLTFLoader().loadAsync(`/proxy/assets/${Type}.glb`)
  );
}

function LoadAccessory(ItemId) {
  return CachedLoad(
    AccessoryCache,
    AccessoryInflight,
    ItemId,
    () => new GLTFLoader().loadAsync(`/api/mesh/${ItemId}`)
  );
}

const BlendShader = (Shader) => {
  Shader.fragmentShader = Shader.fragmentShader.replace(
    '#include <map_fragment>',
    `#ifdef USE_MAP
      vec4 sampledDiffuseColor = texture2D(map, vMapUv);
      diffuseColor.rgb = mix(
        diffuseColor.rgb,
        sampledDiffuseColor.rgb,
        sampledDiffuseColor.a
      );
      diffuseColor.a = 1.0;
    #endif`
  );
};

const HeadBlendShader = (Shader) => {
  Shader.fragmentShader = Shader.fragmentShader.replace(
    '#include <color_fragment>',
    ''
  );

  Shader.fragmentShader = Shader.fragmentShader.replace(
    '#include <map_fragment>',
    `#ifdef USE_MAP
      vec4 sampledDiffuseColor = texture2D(
        map,
        vec2(1.0 - vMapUv.x, vMapUv.y)
      );
      float front = vColor.r;
      diffuseColor.rgb = mix(
        diffuseColor.rgb,
        sampledDiffuseColor.rgb,
        sampledDiffuseColor.a * front
      );
      diffuseColor.a = 1.0;
    #endif`
  );
};

export function createViewer(
  Canvas,
  {
    Width = 210,
    Height = 266,
    RotateToggle = null,
    Interactive = true,
    Transparent = false,
    AutoRotate = true,
    FacingOffsetDeg = 0
  } = {}
) {
  Canvas.Width = Width;
  Canvas.Height = Height;

  const Renderer = new THREE.WebGLRenderer({
    canvas: Canvas,
    antialias: true,
    alpha: Transparent
  });

  Renderer.setSize(Width, Height, false);
  Renderer.outputColorSpace = THREE.SRGBColorSpace;

  const Scene = new THREE.Scene();
  Scene.background = Transparent
    ? null
    : new THREE.Color(0xf4f4f4);

  Scene.add(new THREE.AmbientLight(0xffffff, 1.5));

  const DirectionalLight = new THREE.DirectionalLight(0xffffff, 1.8);
  DirectionalLight.position.set(1.5, 2, 3);
  Scene.add(DirectionalLight);

  const FillLight = new THREE.DirectionalLight(0xffffff, 0.5);
  FillLight.position.set(-2, 0.5, 1);
  Scene.add(FillLight);

  const Camera = new THREE.PerspectiveCamera(
    32,
    Width / Height,
    0.01,
    100
  );

  const Controls = new OrbitControls(Camera, Canvas);

  Controls.enablePan = false;
  Controls.enableZoom = false;
  Controls.enableRotate = Interactive;
  Controls.autoRotate = AutoRotate;
  Controls.autoRotateSpeed = 1.5;
  Controls.enabled = Interactive;

  const BaseYaw =
    Math.PI + THREE.MathUtils.degToRad(FacingOffsetDeg);

  if (RotateToggle) {
    const Icon = RotateToggle.querySelector('i');

    const SyncIcon = () => {
      if (!Icon) {
        return;
      }

      Icon.classList.toggle(
        'fa-lock-open',
        Controls.autoRotate
      );

      Icon.classList.toggle(
        'fa-lock',
        !Controls.autoRotate
      );
    };

    SyncIcon();

    RotateToggle.addEventListener('click', () => {
      Controls.autoRotate = !Controls.autoRotate;
      SyncIcon();
    });
  }

  let ShirtMaterials = [];
  let PantMaterials = [];
  let HeadMaterials = [];
  let BodySlotMaterials = [[], [], [], [], [], []];

  let BodyColors = [
    '#ffffff',
    '#8f61e3',
    '#ffffff',
    '#ffffff',
    '#2e2682',
    '#2e2682'
  ];

  const Wanted = {
    shirt: null,
    pant: null,
    face: null
  };

  let CurrentScene = null;
  let CameraReady = false;
  let ModelGeneration = 0;
  let AccessoryGeneration = 0;

  const EquippedAccessories = new Map();

  function Render() {
    if (!CameraReady) {
      return;
    }

    Controls.update();
    Renderer.render(Scene, Camera);
  }

  function ApplyAllColors() {
    BodyColors.forEach((Hex, Slot) => {
      ApplyColor(Slot, Hex);
    });
  }

  function ExtractMaterials(GLTFScene) {
    ShirtMaterials = [];
    PantMaterials = [];
    HeadMaterials = [];
    BodySlotMaterials = [[], [], [], [], [], []];

    const Seen = new Set();

    GLTFScene.traverse((Node) => {
      if (!Node.isMesh) {
        return;
      }

      const Materials = Array.isArray(Node.material)
        ? Node.material
        : [Node.material];

      Materials.forEach((Material) => {
        if (Seen.has(Material.uuid)) {
          return;
        }

        Seen.add(Material.uuid);

        if (
          SHIRT_MATS.has(Material.name) ||
          PANT_MATS.has(Material.name)
        ) {
          Material.vertexColors = false;
          Material.Transparent = false;
          Material.onBeforeCompile = BlendShader;

          if (SHIRT_MATS.has(Material.name)) {
            ShirtMaterials.push(Material);
          } else {
            PantMaterials.push(Material);
          }
        } else if (Material.name === 'Material.002') {
          Material.vertexColors = true;
          Material.Transparent = false;
          Material.onBeforeCompile = HeadBlendShader;
          HeadMaterials.push(Material);
        } else {
          Material.vertexColors = false;
          Material.map = null;
        }

        const Slot = BODY_MAT_SLOT[Material.name];

        if (Slot !== undefined) {
          BodySlotMaterials[Slot].push(Material);
        }

        Material.needsUpdate = true;
      });
    });

    ApplyAllColors();
    ApplyTexture('face', HeadMaterials, Wanted.face);
  }

  function ApplyColor(Slot, Hex) {
    BodySlotMaterials[Slot].forEach((Material) => {
      Material.color.set(Hex);
      Material.needsUpdate = true;
    });

    Render();
  }

  function ApplyTexture(Slot, Materials, ItemId) {
    Wanted[Slot] = ItemId;

    if (ItemId == null) {
      Materials.forEach((Material) => {
        Material.map = null;
        Material.needsUpdate = true;
      });

      Render();
      return;
    }

    LoadTexture(ItemId).then((Texture) => {
      if (Wanted[Slot] !== ItemId) {
        return;
      }

      Materials.forEach((Material) => {
        Material.map = Texture;
        Material.needsUpdate = true;
      });

      Render();
    });
  }

  async function ApplyModel(Type) {
    const Generation = ++ModelGeneration;

    let GLTF;

    try {
      GLTF = await LoadModel(Type);
    } catch (Error) {
      console.error('Failed to load model:', Type, Error);
      return;
    }

    if (Generation !== ModelGeneration) {
      return;
    }

    if (CurrentScene) {
      Scene.remove(CurrentScene);
    }

    GLTF.scene.rotation.y = BaseYaw;
    Scene.add(GLTF.scene);

    CurrentScene = GLTF.scene;

    ExtractMaterials(GLTF.scene);

    if (!CameraReady) {
      const Box = new THREE.Box3().setFromObject(GLTF.scene);
      const Center = Box.getCenter(new THREE.Vector3());
      const Size = Box.getSize(new THREE.Vector3());

      const Distance =
        (Size.y / 2) /
        Math.tan((Camera.fov * Math.PI / 180) / 2) *
        1.15;

      Camera.position.set(
        Center.x,
        Center.y,
        Center.z + Distance
      );

      Controls.target.copy(Center);
      Controls.update();

      CameraReady = true;

      if (Interactive) {
        function Animate() {
          requestAnimationFrame(Animate);
          Controls.update();
          Renderer.render(Scene, Camera);
        }

        Animate();
      }
    }

    ApplyShirt(Wanted.shirt);
    ApplyPant(Wanted.pant);
    ApplyFace(Wanted.face);

    Render();
  }

  function ApplyBodyColors(HexArray) {
    BodyColors = HexArray.slice();
    ApplyAllColors();
  }

  function ApplyBodyColor(Slot, Hex) {
    BodyColors[Slot] = Hex;
    ApplyColor(Slot, Hex);
  }

  function GetBodyColors() {
    return BodyColors.slice();
  }

  function ApplyShirt(ItemId) {
    ApplyTexture('shirt', ShirtMaterials, ItemId);
  }

  function ApplyPant(ItemId) {
    ApplyTexture('pant', PantMaterials, ItemId);
  }

  function ApplyFace(ItemId) {
    ApplyTexture('face', HeadMaterials, ItemId);
  }

  function LoadBatch(ItemIds) {
    const Missing = ItemIds.filter(
      (Id) =>
        !AccessoryCache.has(Id) &&
        !AccessoryInflight.has(Id)
    );

    if (Missing.length) {
      const PromiseValue = fetch(
        `/proxy/api/meshes?ids=${Missing.join(',')}`
      )
        .then((Response) => Response.json())
        .then((Data) =>
          Promise.all(
            Object.entries(Data).map(
              async ([IdString, Entry]) => {
                if (!Entry.data) {
                  return;
                }

                const GLTF =
                  await new GLTFLoader().parseAsync(
                    B64ToBuffer(Entry.data),
                    ''
                  );

                AccessoryCache.set(
                  parseInt(IdString, 10),
                  GLTF
                );
              }
            )
          )
        );

      Missing.forEach((Id) => {
        AccessoryInflight.set(
          Id,
          PromiseValue.finally(() =>
            AccessoryInflight.delete(Id)
          )
        );
      });
    }

    return Promise.all(
      ItemIds.map(
        (Id) =>
          AccessoryInflight.get(Id) ??
          Promise.resolve()
      )
    );
  }

  function UnequipAccessory(ItemId) {
    const Object = EquippedAccessories.get(ItemId);

    if (!Object) {
      return;
    }

    Scene.remove(Object);
    EquippedAccessories.delete(ItemId);

    Render();
  }

  function SpawnAccessory(ItemId, GLTF) {
    if (EquippedAccessories.has(ItemId) || !GLTF) {
      return;
    }

    const AccessoryScene = GLTF.scene.clone(true);

    AccessoryScene.rotation.y = BaseYaw;
    Scene.add(AccessoryScene);

    EquippedAccessories.set(
      ItemId,
      AccessoryScene
    );
  }

  async function EquipAccessory(ItemId) {
    if (EquippedAccessories.has(ItemId)) {
      return;
    }

    SpawnAccessory(
      ItemId,
      await LoadAccessory(ItemId)
    );

    Render();
  }

  async function SetAccessories(ItemIds) {
    const Generation = ++AccessoryGeneration;
    const WantedIds = new Set(ItemIds);

    await LoadBatch(ItemIds);

    if (Generation !== AccessoryGeneration) {
      return;
    }

    for (const Id of Array.from(EquippedAccessories.keys())) {
      if (!WantedIds.has(Id)) {
        UnequipAccessory(Id);
      }
    }

    for (const Id of ItemIds) {
      SpawnAccessory(
        Id,
        AccessoryCache.get(Id)
      );
    }

    Render();
  }

  async function LoadOutfit(Outfit) {
    ApplyBodyColors(
      Array.isArray(Outfit.body_colors) &&
      Outfit.body_colors.length === 6
        ? Outfit.body_colors
        : BodyColors
    );

    await ApplyModel(
      Outfit.body_type === 'female'
        ? 'female'
        : 'male'
    );

    ApplyShirt(Outfit.shirt_id ?? null);
    ApplyPant(Outfit.pant_id ?? null);
    ApplyFace(Outfit.face_id ?? null);

    await SetAccessories(
      Array.isArray(Outfit.accessory_ids)
        ? Outfit.accessory_ids
        : []
    );
  }

  return {
    ApplyModel: ApplyModel,
    ApplyBodyColors: ApplyBodyColors,
    ApplyBodyColor: ApplyBodyColor,
    GetBodyColors: GetBodyColors,
    ApplyShirt: ApplyShirt,
    ApplyPant: ApplyPant,
    ApplyFace: ApplyFace,
    EquipAccessory: EquipAccessory,
    UnequipAccessory: UnequipAccessory,
    SetAccessories: SetAccessories,
    LoadOutfit: LoadOutfit,
    Controls: Controls
  };
}
