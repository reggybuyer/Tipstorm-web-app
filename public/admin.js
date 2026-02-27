const API = "https://tipstorm-web-app-1.onrender.com";

// LOGIN
async function adminLogin() {
  const email = adminEmail.value;
  const password = adminPassword.value;

  const res = await fetch(`${API}/login`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();
  if (!data.success || data.user.role !== "admin") {
    alert("Admin login failed");
    return;
  }

  localStorage.setItem("token", data.token);
  alert("Admin logged in");
}

// USERS
async function loadUsers() {
  const token = localStorage.getItem("token");
  if (!token) return alert("Login first");

  const res = await fetch(`${API}/all-users`, {
    headers: {"Authorization": `Bearer ${token}`}
  });

  const data = await res.json();
  usersGrid.innerHTML = "";

  data.users.forEach(u => {
    usersGrid.innerHTML += `
      <div class="card">
        <strong>${u.email}</strong>
        <p>Plan: ${u.plan}</p>
        <p>Premium: ${u.premium}</p>
      </div>
    `;
  });
} 
