/* ------------------------------
   BURGER MENU
------------------------------ */
function toggleMenu() {
  const nav = document.getElementById("navMenu");
  const burger = document.querySelector(".burger");

  burger.classList.toggle("active");
  nav.classList.toggle("open");
}

// Close menu when clicking outside
document.addEventListener("click", function (e) {
  const nav = document.getElementById("navMenu");
  const burger = document.querySelector(".burger");

  if (
    nav.classList.contains("open") &&
    !nav.contains(e.target) &&
    !burger.contains(e.target)
  ) {
    nav.classList.remove("open");
    burger.classList.remove("active");
  }
});


function scrollToAppointment() {
  document.getElementById("appointment").scrollIntoView({
    behavior: "smooth"
  });
}


/* ------------------------------
   APPOINTMENT FORM
------------------------------ */

// Attach submit event to correct form
document.getElementById("appointmentForm").addEventListener("submit", function (e) {
  e.preventDefault();

  let name = document.getElementById("name").value.trim();
  let phone = document.getElementById("phone").value.trim();
  let service = document.getElementById("service").value.trim();
  let date = document.getElementById("date").value.trim();

  if (name === "" || phone.length < 10 || service === "" || date === "") {
    alert("Please fill all fields correctly.");
    return;
  }

  // CREATE APPOINTMENT OBJECT
  const appointment = {
    name,
    phone,
    service,
    date,
    time: new Date().toLocaleTimeString()
  };

  // SAVE TO LOCAL STORAGE
  let appointments = JSON.parse(localStorage.getItem("appointments")) || [];
  appointments.push(appointment);
  localStorage.setItem("appointments", JSON.stringify(appointments));

  // SHOW POPUP
  const popup = document.getElementById("popup");
  popup.style.display = "block";

  // HIDE POPUP AFTER 3 SECONDS
  setTimeout(() => {
    popup.style.display = "none";
  }, 3000);

  // RESET FORM
  this.reset();
});

