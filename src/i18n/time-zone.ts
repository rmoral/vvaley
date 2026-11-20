// Zona horaria de las fechas y horas de la web pública. Los eventos son en
// Andorra y la web se lee en hora de Andorra: sin fijarla, cada fecha salía
// en la zona de la máquina que la pinta (UTC en un servidor, la del navegador
// en el cliente) y la hora de un evento podía variar una hora según la página.
// Un evento con zona propia (Event.timezone) la sigue pasando explícitamente.
export const SITE_TIME_ZONE = "Europe/Andorra";
