// CHECK LOGIN
if (localStorage.getItem("adminLoggedIn") !== "true") {
  window.location.href = "/admin.html";
}

// LOAD APPOINTMENTS
function loadAppointments() {
  const list = document.getElementById("appointmentList");
  list.innerHTML = "";

  let appointments = JSON.parse(localStorage.getItem("appointments")) || [];

  appointments.forEach((appt, index) => {
    let row = `
      <tr>
        <td>${appt.name}</td>
        <td>${appt.phone}</td>
        <td>${appt.service}</td>
        <td>${appt.date}</td>
        <td>${appt.time}</td>
        <td><button class="delete-btn" onclick="deleteAppt(${index})">Delete</button></td>
      </tr>
    `;
    list.innerHTML += row;
  });
}

// DELETE APPOINTMENT
function deleteAppt(index) {
  let appointments = JSON.parse(localStorage.getItem("appointments")) || [];
  appointments.splice(index, 1);
  localStorage.setItem("appointments", JSON.stringify(appointments));
  loadAppointments();
}

// CLEAR ALL
function clearAll() {
  if (confirm("Are you sure you want to delete all appointments?")) {
    localStorage.removeItem("appointments");
    loadAppointments();
  }
}

// LOGOUT
function logout() {
  localStorage.removeItem("adminLoggedIn");
  window.location.href = "/admin.html";
}

// INITIAL LOAD
loadAppointments();
