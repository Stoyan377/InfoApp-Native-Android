// InfoApp - Modern Device Information Application
// Native Android WebView version - uses Web APIs and Android JavaScript Bridge

(function () {
    'use strict';

    // Initialize when DOM is ready (no Cordova deviceready needed)
    document.addEventListener('DOMContentLoaded', onReady, false);

    // ============================================================================
    // UI Manager - Handle all UI interactions and modal display
    // ============================================================================
    const UIManager = {
        modal: null,
        modalTitle: null,
        modalBody: null,
        timeDisplay: null,
        dateDisplay: null,

        init() {
            this.modal = document.getElementById('infoModal');
            this.modalTitle = document.getElementById('modalTitle');
            this.modalBody = document.getElementById('modalBody');
            this.timeDisplay = document.getElementById('timeDisplay');
            this.dateDisplay = document.getElementById('dateDisplay');

            this.setupEventListeners();
            this.updateDateTime();
            // Update time every second
            setInterval(() => this.updateDateTime(), 1000);
        },

        setupEventListeners() {
            document.getElementById('batteryBtn').addEventListener('click', () => DeviceInfo.showBattery());
            document.getElementById('deviceBtn').addEventListener('click', () => DeviceInfo.showDevice());
            document.getElementById('networkBtn').addEventListener('click', () => DeviceInfo.showNetwork());
            document.getElementById('orientationBtn').addEventListener('click', () => DeviceInfo.showOrientation());
            document.getElementById('locationBtn').addEventListener('click', () => DeviceInfo.showLocation());
            document.querySelector('.modal-close').addEventListener('click', () => this.closeModal());
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) this.closeModal();
            });
        },

        updateDateTime() {
            const now = new Date();
            
            // Format time as HH:MM:SS
            const time = [
                String(now.getHours()).padStart(2, '0'),
                String(now.getMinutes()).padStart(2, '0'),
                String(now.getSeconds()).padStart(2, '0')
            ].join(':');

            // Format date as DD/MM/YYYY
            const date = [
                String(now.getDate()).padStart(2, '0'),
                String(now.getMonth() + 1).padStart(2, '0'),
                now.getFullYear()
            ].join('/');

            this.timeDisplay.textContent = time;
            this.dateDisplay.textContent = date;
        },

        showModal(title, content) {
            this.modalTitle.textContent = title;
            this.modalBody.innerHTML = content;
            this.modal.showModal();
        },

        closeModal() {
            this.modal.close();
        },

        createInfoRow(label, value) {
            return `<div class="info-row">
                <span class="info-label">${label}</span>
                <span class="info-value">${value || 'N/A'}</span>
            </div>`;
        },

        createAlertBox(message, type = 'info') {
            const typeClass = type === 'warning' ? 'alert-warning' : type === 'error' ? 'alert-error' : 'alert-success';
            return `<div class="${typeClass}">${message}</div>`;
        }
    };

    // ============================================================================
    // Device Info Manager - Fetch and display device information
    // ============================================================================
    const DeviceInfo = {
        showBattery() {
            if (navigator.getBattery) {
                navigator.getBattery().then((battery) => {
                    const level = Math.round(battery.level * 100);
                    const status = battery.charging ? 'Включено (зарежда се)' : 'На батерия';
                    const alert = level < 20 && !battery.charging
                        ? UIManager.createAlertBox('⚠️ Ниво на батерията е критично!', 'warning')
                        : '';

                    let content = `
                        ${alert}
                        <div>
                            ${UIManager.createInfoRow('Ниво', `${level}%`)}
                            ${UIManager.createInfoRow('Статус', status)}
                            ${battery.chargingTime !== Infinity ? UIManager.createInfoRow('Време до пълно зареждане', `${Math.round(battery.chargingTime / 60)} мин`) : ''}
                            ${battery.dischargingTime !== Infinity ? UIManager.createInfoRow('Оставащо време', `${Math.round(battery.dischargingTime / 60)} мин`) : ''}
                        </div>
                    `;
                    UIManager.showModal('🔋 Информация за батерията', content);
                }).catch((error) => {
                    const content = UIManager.createAlertBox('Батерийната информация не е достъпна: ' + error.message, 'error');
                    UIManager.showModal('🔋 Батерия', content);
                });
            } else {
                const content = UIManager.createAlertBox('Battery API не се поддържа от този браузър', 'error');
                UIManager.showModal('🔋 Батерия', content);
            }
        },

        showDevice() {
            // Use Android JavaScript Bridge for native device info
            if (typeof AndroidBridge !== 'undefined') {
                try {
                    const info = JSON.parse(AndroidBridge.getDeviceInfo());
                    const content = `
                        ${UIManager.createInfoRow('Платформа', info.platform)}
                        ${UIManager.createInfoRow('Версия', info.version)}
                        ${UIManager.createInfoRow('Производител', info.manufacturer)}
                        ${UIManager.createInfoRow('Модел', info.model)}
                        ${UIManager.createInfoRow('Марка', info.brand)}
                        ${UIManager.createInfoRow('SDK версия', info.sdkVersion)}
                        ${UIManager.createInfoRow('Продукт', info.product)}
                        ${UIManager.createInfoRow('Хардуер', info.hardware)}
                        ${UIManager.createInfoRow('Виртуално', info.isVirtual ? 'Да' : 'Не')}
                    `;
                    UIManager.showModal('📱 Информация за устройството', content);
                } catch (e) {
                    const content = UIManager.createAlertBox('Грешка при четене на информацията: ' + e.message, 'error');
                    UIManager.showModal('📱 Устройство', content);
                }
            } else {
                // Fallback: use navigator.userAgent
                const content = `
                    ${UIManager.createInfoRow('Платформа', navigator.platform || 'N/A')}
                    ${UIManager.createInfoRow('User Agent', navigator.userAgent)}
                    ${UIManager.createInfoRow('Език', navigator.language)}
                    ${UIManager.createInfoRow('Ядра', navigator.hardwareConcurrency ? navigator.hardwareConcurrency.toString() : 'N/A')}
                `;
                UIManager.showModal('📱 Информация за устройството', content);
            }
        },

        showNetwork() {
            const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
            const isOnline = navigator.onLine ? '🟢 Онлайн' : '🔴 Офлайн';

            let connectionType = 'Неразпозната';
            let effectiveType = '';

            if (connection) {
                connectionType = connection.type || connection.effectiveType || 'Неразпозната';
                
                const typeMap = {
                    'wifi': 'WiFi',
                    'cellular': 'Мобилна мрежа',
                    'ethernet': 'Ethernet',
                    'bluetooth': 'Bluetooth',
                    'none': 'Няма връзка',
                    '4g': '4G',
                    '3g': '3G',
                    '2g': '2G',
                    'slow-2g': 'Бавен 2G'
                };
                connectionType = typeMap[connectionType] || connectionType;
                
                if (connection.effectiveType) {
                    effectiveType = connection.effectiveType.toUpperCase();
                }
            }

            let content = `
                ${UIManager.createInfoRow('Статус', isOnline)}
                ${UIManager.createInfoRow('Тип връзка', connectionType)}
                ${effectiveType ? UIManager.createInfoRow('Мрежова технология', effectiveType) : ''}
                
                <div class="speed-test-card">
                    <div class="speed-meter-container">
                        <div class="speed-unit" id="speedStatusText">Тест на скоростта в реално време</div>
                        <div class="speed-value-display" id="speedVal">--</div>
                        <div class="speed-unit">Mbps</div>
                        <div class="speed-progress-bar">
                            <div class="speed-progress-fill" id="speedProgress" style="width: 0%;"></div>
                        </div>
                    </div>
                    <div class="speed-metrics-grid">
                        <div class="speed-metric-item">
                            <div class="speed-metric-label">Пинг</div>
                            <div class="speed-metric-val" id="pingVal">-- ms</div>
                        </div>
                        <div class="speed-metric-item">
                            <div class="speed-metric-label">Качество</div>
                            <div class="speed-metric-val" id="qualityVal">--</div>
                        </div>
                    </div>
                    <button class="btn test-btn" id="startSpeedTestBtn">
                        <span class="btn-icon">⚡</span>
                        <span class="btn-text">Тествай скоростта</span>
                    </button>
                </div>
            `;

            UIManager.showModal('📡 Мрежова информация', content);

            const startBtn = document.getElementById('startSpeedTestBtn');
            if (startBtn) {
                startBtn.addEventListener('click', () => this.runSpeedTest());
            }

            setTimeout(() => this.runSpeedTest(), 300);
        },

        async runSpeedTest() {
            const speedVal = document.getElementById('speedVal');
            const speedStatus = document.getElementById('speedStatusText');
            const speedProgress = document.getElementById('speedProgress');
            const pingVal = document.getElementById('pingVal');
            const qualityVal = document.getElementById('qualityVal');
            const startBtn = document.getElementById('startSpeedTestBtn');

            if (!speedVal || !speedProgress) return;

            if (startBtn) startBtn.disabled = true;
            speedStatus.textContent = 'Измерване на пинг...';
            speedProgress.style.width = '15%';
            speedVal.textContent = '...';

            let pingMs = 0;
            try {
                const pingUrl = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js?ping=' + Date.now();
                const pStart = performance.now();
                await fetch(pingUrl, { method: 'HEAD', cache: 'no-store' }).catch(() => {});
                const pEnd = performance.now();
                pingMs = Math.round(pEnd - pStart);
                if (pingVal) pingVal.textContent = `${pingMs} ms`;
            } catch (e) {
                if (pingVal) pingVal.textContent = 'N/A';
            }

            speedStatus.textContent = 'Измерване на скорост...';
            speedProgress.style.width = '40%';

            try {
                const downloadUrl = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js?_t=' + Date.now();
                const startTime = performance.now();
                
                const response = await fetch(downloadUrl, { cache: 'no-store' });
                const blob = await response.blob();
                const endTime = performance.now();

                speedProgress.style.width = '85%';
                const durationSeconds = (endTime - startTime) / 1000;
                const bitsLoaded = blob.size * 8;
                const speedBps = bitsLoaded / durationSeconds;
                const speedMbps = (speedBps / (1024 * 1024)).toFixed(2);

                speedProgress.style.width = '100%';
                if (speedVal) speedVal.textContent = speedMbps;
                if (speedStatus) speedStatus.textContent = 'Тестът завърши успешно';

                const speedNum = parseFloat(speedMbps);
                let qualityText = 'Задоволително 📶';
                if (speedNum >= 25) {
                    qualityText = 'Отлично 🚀';
                } else if (speedNum >= 10) {
                    qualityText = 'Добро ⚡';
                } else if (speedNum < 3) {
                    qualityText = 'Ниско 🐌';
                }
                if (qualityVal) qualityVal.textContent = qualityText;

            } catch (err) {
                if (speedStatus) speedStatus.textContent = 'Грешка при теста на скоростта';
                if (speedVal) speedVal.textContent = 'N/A';
                if (qualityVal) qualityVal.textContent = 'Неизвестно';
            } finally {
                if (startBtn) startBtn.disabled = false;
            }
        },

        showOrientation() {
            if (screen.orientation) {
                const orientation = screen.orientation.type || 'Неизвестна';
                const angle = screen.orientation.angle || 0;

                // Map orientation types to Bulgarian
                const orientationMap = {
                    'portrait-primary': 'Портрет (основен)',
                    'portrait-secondary': 'Портрет (обърнат)',
                    'landscape-primary': 'Пейзаж (основен)',
                    'landscape-secondary': 'Пейзаж (обърнат)'
                };
                const orientationText = orientationMap[orientation] || orientation;

                const content = `
                    ${UIManager.createInfoRow('Ориентация', orientationText)}
                    ${UIManager.createInfoRow('Ъгъл', `${angle}°`)}
                    ${UIManager.createInfoRow('Ширина на екрана', `${screen.width}px`)}
                    ${UIManager.createInfoRow('Височина на екрана', `${screen.height}px`)}
                `;
                UIManager.showModal('🔄 Ориентация на устройството', content);
            } else {
                UIManager.showModal('🔄 Ориентация', 
                    UIManager.createAlertBox('Orientation API не е наличен', 'error'));
            }
        },

        showLocation() {
            if (!navigator.geolocation) {
                UIManager.showModal('📍 Местоположение',
                    UIManager.createAlertBox('Geolocation API не се поддържа', 'error'));
                return;
            }

            const options = {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 20000
            };

            // Show loading state
            UIManager.showModal('📍 Местоположение',
                UIManager.createAlertBox('⏳ Определяне на местоположението...', 'info'));

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const coords = position.coords;
                    const content = `
                        ${UIManager.createInfoRow('Географска ширина', coords.latitude.toFixed(6))}
                        ${UIManager.createInfoRow('Географска дължина', coords.longitude.toFixed(6))}
                        ${UIManager.createInfoRow('Височина', coords.altitude ? `${coords.altitude.toFixed(2)} м` : 'N/A')}
                        ${UIManager.createInfoRow('Точност', `${coords.accuracy.toFixed(2)} м`)}
                        ${UIManager.createInfoRow('Посока', coords.heading ? `${coords.heading}°` : 'N/A')}
                        ${UIManager.createInfoRow('Скорост', coords.speed ? `${coords.speed.toFixed(2)} м/с` : 'N/A')}
                        ${UIManager.createInfoRow('Време', new Date(position.timestamp).toLocaleString('bg-BG'))}
                    `;
                    UIManager.showModal('📍 Местоположение', content);
                },
                (error) => {
                    const errorMessages = {
                        1: 'Разрешението е отказано. Моля, позволете достъп до местоположението в настройките.',
                        2: 'Позицията е недостъпна',
                        3: 'Времето за изчакване е изтекло'
                    };
                    const message = errorMessages[error.code] || error.message;
                    const content = UIManager.createAlertBox(`❌ ${message}`, 'error');
                    UIManager.showModal('📍 Местоположение', content);
                },
                options
            );
        }
    };

    // ============================================================================
    // App Lifecycle
    // ============================================================================

    function onReady() {
        UIManager.init();
    }
})();
