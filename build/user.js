const API = "https://tipstorm-web-app-1.onrender.com";

window.onload = () => {
  const email = document.getElementById("email")?.value || "User";
  document.getElementById("welcome").innerText = email;

  document.getElementById("subscriptionMessage").innerHTML = `
    Send payment to 0789906001 (Mpesa).
    After payment, send confirmation with your email.
  `;
};

// LOAD SLIPS
async function loadSlips() {
  const plan = document.getElementById("plan").value;
  const res = await fetch(`${API}/slips?plan=${plan}`);
  const data = await res.json();
  const grid = document.getElementById("slipGrid");
  grid.innerHTML = "";

  data.slips.forEach(slip => {
    let games = "";

    slip.games.forEach(g => {
      games += `
        <div class="game">
          <strong>${g.home} vs ${g.away}</strong>
          <p>Odd: ${g.odd}</p>
          <p>Market: ${g.overUnder || "N/A"}</p>
          <p>Status: ${g.result.toUpperCase()}</p>
        </div>
      `;
    });

    grid.innerHTML += `
      <div class="card">
        <div class="badge">${slip.date} - ${slip.access.toUpperCase()}</div>
        <p>Total Odds: ${slip.totalOdds}</p>
        ${games}
      </div>
    `;
  });
}

// POPUP
function closePopup() {
  document.getElementById("paymentPopup").style.display = "none";
} 
