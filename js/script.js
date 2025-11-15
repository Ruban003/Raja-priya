function toggleMenu() {
  const nav = document.getElementById("navMenu");
  nav.style.display = nav.style.display === "flex" ? "none" : "flex";
}

function scrollToAppointment() {
  document.getElementById("appointment").scrollIntoView({ behavior: "smooth" });
}

document
  .getElementById("appointmentForm")
  .addEventListener("submit", function (e) {
    e.preventDefault();
    alert("Appointment submitted successfully!");
  });
