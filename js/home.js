import { createViewer } from "/js/avatar.js";

const Proxy = "/proxy";
const APIBase = Proxy + "/api";
const APIGames = APIBase + "/games";
const APICatalog = APIBase + "/catalog/init";
const APIFriends = APIBase + "/friends";
const APIMe = Proxy + "/me";
const AssetsBase = Proxy + "/assets";

async function GetContentFromAPI(Url) {
  const Response = await fetch(Url);
  const Data = await Response.json();
  return Data;
}

async function Main() {
  const MeData = await GetContentFromAPI(APIMe);

  const HomeGreeting = document.querySelector("#HomeGreeting");
  HomeGreeting.innerHTML = `Hello, ${MeData.username}`;

  const CatalogData = await GetContentFromAPI(APICatalog);
  const Viewer = createViewer(document.getElementById("AvatarViewer"), {
    Width: 170,
    Height: 220,
    Interactive: true,
    Transparent: true,
    AutoRotate: false,
    FacingOffsetDeg: 25
  });
  Viewer.LoadOutfit(CatalogData);

  const FriendsData = await GetContentFromAPI(APIFriends);
  const FriendsAvatar = await window.FetchAvatars(
    FriendsData.map((FriendData) => FriendData.id)
  );
  const FriendCount = document.querySelector("#FriendCount");
  const FriendsRow = document.querySelector(".FriendsRow");

  const ColorTable = {
    "in_studio": "#a78bfa",
    "offline": "6b6b7c",
    "online": "2563eb",
    "playing": "16a34a"
  };
  const StatusTable = {
    "in_studio": "In Studio",
    "offline": "Offline",
    "online": "Online",
    "playing": "Playing"
  };

  for (const FriendData of FriendsData) {
    const Card = document.createElement("a");
    Card.className = "FriendCard";
    Card.href = `/profile.html?id=${FriendData.id}`;

    Card.innerHTML = `
      <img class="FriendImage" src="${FriendsAvatar.get(String(FriendData.id))}" alt="Friend">
      <div class="FriendCardContent">
        <span class="FriendCardName">${FriendData.username}</span>
        <span class="FriendCardStatus" style="color: ${ColorTable[FriendData.online_status]}">${StatusTable[FriendData.online_status]}</span>
      </div>
    `;

    FriendsRow.appendChild(Card);
  }
  FriendCount.innerHTML = `Friends (${FriendsData.length})`;

  const GamesData = await GetContentFromAPI(APIGames);
  const GameGrid = document.querySelector(".GameGrid");

  GamesData.sort((A, B) => B.player_count - A.player_count);
  for (const GameData of GamesData) {
    const Card = document.createElement("a");
    Card.className = "GameCard";
    Card.href = `/game.html?id=${GameData.id}`;

    Card.innerHTML = `
      <img src="${AssetsBase}/thumbnails/${GameData.id}?v=${GameData.thumbnail_version}" alt="${GameData.name}">
      <div class="GameCardContent">
        <h3>${GameData.name}</h3>
        <div class="GameCardStats">
          <i class="fa-solid fa-users"></i>
          <span>${GameData.player_count}</span>
        </div>
      </div>
    `;

    GameGrid.appendChild(Card);
  }

  const FriendPrevious = document.querySelector("#FriendPrevious");
  const FriendNext = document.querySelector("#FriendNext");

  FriendPrevious.addEventListener("click", () => {
    FriendsRow.scrollBy({
      left: -(window.innerWidth - 570),
      behavior: "smooth"
    });
  });

  FriendNext.addEventListener("click", () => {
    FriendsRow.scrollBy({
      left: window.innerWidth - 570,
      behavior: "smooth"
    });
  });

  const NavBarMe = document.querySelector("#NavBarMe");
  NavBarMe.href = `/profile.html?id=${MeData.id}`;
}

Main();
