const Proxy = "/proxy";
const APIBase = Proxy + "/api";
const APIAvatar = APIBase + "/users/avatar-pictures?ids=";

const AvatarCache = new Map();
const AvatarCacheTime = 60 * 1000;

async function GetContentFromAPI(Url) {
  const Response = await fetch(Url);
  return await Response.json();
}

async function FetchAvatars(IDs) {
  const Now = Date.now();
  const MissingIDs = [];

  for (const ID of IDs) {
    const Cached = AvatarCache.get(String(ID));

    if (!Cached || Now - Cached.Time >= AvatarCacheTime) {
      MissingIDs.push(ID);
    }
  }

  if (MissingIDs.length > 0) {
    const Data = await GetContentFromAPI(APIAvatar + MissingIDs.join(","));

    for (const [ID, DataUri] of Object.entries(Data)) {
      AvatarCache.set(String(ID), {
        Image: DataUri,
        Time: Date.now()
      });
    }
  }

  const Avatars = new Map();

  for (const ID of IDs) {
    const Avatar = AvatarCache.get(String(ID));

    if (Avatar) {
      Avatars.set(String(ID), Avatar.Image);
    }
  }

  return Avatars;
}

window.AvatarCache = AvatarCache;
window.FetchAvatars = FetchAvatars;
