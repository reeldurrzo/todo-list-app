const searchForm = document.getElementById('search-form');
const cityInput = document.getElementById('city-input');
const statusEl = document.getElementById('status');

const locationNameEl = document.getElementById('location-name');
const locationSubtitleEl = document.getElementById('location-subtitle');
const weatherIconEl = document.getElementById('weather-icon');
const temperatureEl = document.getElementById('temperature');
const conditionEl = document.getElementById('condition');
const feelsLikeEl = document.getElementById('feels-like');
const humidityEl = document.getElementById('humidity');
const windEl = document.getElementById('wind');
const precipitationEl = document.getElementById('precipitation');
const sunriseEl = document.getElementById('sunrise');
const sunsetEl = document.getElementById('sunset');
const highTempEl = document.getElementById('high-temp');
const lowTempEl = document.getElementById('low-temp');
const forecastListEl = document.getElementById('forecast-list');

const weatherCodeMap = {
  0: { label: 'Clear sky', icon: '☀️' },
  1: { label: 'Mainly clear', icon: '🌤️' },
  2: { label: 'Partly cloudy', icon: '⛅' },
  3: { label: 'Overcast', icon: '☁️' },
  45: { label: 'Foggy', icon: '🌫️' },
  48: { label: 'Depositing rime fog', icon: '🌫️' },
  51: { label: 'Light drizzle', icon: '🌦️' },
  53: { label: 'Drizzle', icon: '🌦️' },
  55: { label: 'Heavy drizzle', icon: '🌧️' },
  56: { label: 'Freezing drizzle', icon: '🌧️' },
  57: { label: 'Heavy freezing drizzle', icon: '🌧️' },
  61: { label: 'Light rain', icon: '🌦️' },
  63: { label: 'Rain', icon: '🌧️' },
  65: { label: 'Heavy rain', icon: '🌧️' },
  66: { label: 'Freezing rain', icon: '🌧️' },
  67: { label: 'Heavy freezing rain', icon: '🌧️' },
  71: { label: 'Light snow', icon: '🌨️' },
  73: { label: 'Snow', icon: '❄️' },
  75: { label: 'Heavy snow', icon: '❄️' },
  77: { label: 'Snow grains', icon: '❄️' },
  80: { label: 'Rain showers', icon: '🌦️' },
  81: { label: 'Heavy rain showers', icon: '🌧️' },
  82: { label: 'Violent rain showers', icon: '⛈️' },
  85: { label: 'Snow showers', icon: '🌨️' },
  86: { label: 'Heavy snow showers', icon: '🌨️' },
  95: { label: 'Thunderstorm', icon: '⛈️' },
  96: { label: 'Thunderstorm with hail', icon: '⛈️' },
  99: { label: 'Severe hail storm', icon: '⛈️' }
};

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle('error', isError);
}

function formatTime(value) {
  const date = new Date(value);
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(date);
}

function formatDay(value) {
  const date = new Date(value);
  return new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date);
}

function getWeatherMeta(code) {
  return weatherCodeMap[code] || { label: 'Weather', icon: '🌤️' };
}

function updateDashboard(data, location) {
  const current = data.current;
  const daily = data.daily;
  const currentMeta = getWeatherMeta(current.weather_code);

  locationNameEl.textContent = `${location.name}${location.admin1 ? `, ${location.admin1}` : ''}`;
  locationSubtitleEl.textContent = `${location.country || 'Unknown region'} • ${new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date())}`;

  weatherIconEl.textContent = currentMeta.icon;
  temperatureEl.textContent = `${Math.round(current.temperature_2m)}°`;
  conditionEl.textContent = currentMeta.label;
  feelsLikeEl.textContent = `${Math.round(current.apparent_temperature)}°`;
  humidityEl.textContent = `${Math.round(current.relative_humidity_2m)}%`;
  windEl.textContent = `${Math.round(current.wind_speed_10m)} km/h`;
  precipitationEl.textContent = `${current.precipitation} mm`;

  sunriseEl.textContent = formatTime(daily.sunrise[0]);
  sunsetEl.textContent = formatTime(daily.sunset[0]);
  highTempEl.textContent = `${Math.round(daily.temperature_2m_max[0])}°`;
  lowTempEl.textContent = `${Math.round(daily.temperature_2m_min[0])}°`;

  forecastListEl.innerHTML = daily.time
    .slice(1, 6)
    .map((day, index) => {
      const code = daily.weather_code[index + 1];
      const meta = getWeatherMeta(code);
      const high = Math.round(daily.temperature_2m_max[index + 1]);
      const low = Math.round(daily.temperature_2m_min[index + 1]);

      return `
        <article class="forecast-card">
          <div class="forecast-date">${formatDay(day)}</div>
          <div class="forecast-icon" aria-hidden="true">${meta.icon}</div>
          <strong>${high}°</strong>
          <span>${low}° • ${meta.label}</span>
        </article>
      `;
    })
    .join('');
}

async function fetchWeatherForCity(cityName) {
  const query = cityName.trim();
  if (!query) {
    setStatus('Please enter a city name.', true);
    return;
  }

  setStatus('Loading weather data...');

  try {
    const geoResponse = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`
    );

    if (!geoResponse.ok) {
      throw new Error('Unable to find that location.');
    }

    const geoData = await geoResponse.json();

    if (!geoData.results || geoData.results.length === 0) {
      throw new Error(`No weather data found for "${query}".`);
    }

    const location = geoData.results[0];
    const weatherResponse = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset&timezone=auto&forecast_days=5`
    );

    if (!weatherResponse.ok) {
      throw new Error('Weather service failed to respond.');
    }

    const weatherData = await weatherResponse.json();
    updateDashboard(weatherData, location);
    setStatus(`Showing forecasts for ${location.name}.`);
  } catch (error) {
    setStatus(error.message || 'Something went wrong while fetching weather data.', true);
  }
}

searchForm.addEventListener('submit', (event) => {
  event.preventDefault();
  fetchWeatherForCity(cityInput.value);
});

fetchWeatherForCity(cityInput.value);
