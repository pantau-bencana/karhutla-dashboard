const FIRMS_FIRMS = "https://earthdata.nasa.gov/firms";
const FIRMS_LANCE = "https://earthdata.nasa.gov/lance";

export function FirmsAck() {
  return (
    <p className="atribusi">
      We acknowledge the use of data and/or imagery from NASA's{" "}
      <a href={FIRMS_FIRMS} target="_blank" rel="noopener noreferrer">Fire Information for Resource Management System (FIRMS)</a>
      {" "}(https://earthdata.nasa.gov/firms), part of NASA's{" "}
      <a href={FIRMS_LANCE} target="_blank" rel="noopener noreferrer">Land, Atmosphere Near real-time Capability for Earth observations (LANCE)</a>
      {" "}(https://earthdata.nasa.gov/lance) and NASA's Earth Science Data and Information System (ESDIS).
    </p>
  );
}

export function OpenMeteoCredit() {
  return (
    <p className="atribusi">
      <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Weather data by Open-Meteo.com</a>
    </p>
  );
}
