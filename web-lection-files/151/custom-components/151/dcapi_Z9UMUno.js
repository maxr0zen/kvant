/**
 DCAPI
*/

class DCAPI {
  constructor() {
    this.initialized = false;
    this.parentOrigin = null;
    this.init();
  }

  /**
   * Инициализация API и настройка обработчиков сообщений
   */
  init() {
    if (this.initialized) return;

    window.addEventListener("message", this.handleMessage.bind(this));
    this.initialized = true;

    console.log("DCAPI initialized");
  }

  /**
   * Обработчик входящих сообщений
   * @param {MessageEvent} event - Событие сообщения
   */
  handleMessage(event) {
    const { data } = event;

    if (!data || typeof data !== "object" || !data.type) return;

    if (!this.parentOrigin && data.type && data.type.includes(".response")) {
      this.parentOrigin = event.origin;
    }

    switch (data.type) {
      case "dcapi.getScreenSize.response":
        this.handleGetScreenSizeResponse(data);
        break;
      case "dcapi.getResults.response":
        this.handleGetResultsResponse(data);
        break;
      case "dcapi.isPassed.response":
        this.handleIsPassedResponse(data);
        break;
      case "dcapi.setResults.response":
        this.handleSetResultsResponse(data);
        break;
      case "dcapi.getScoresUser.response":
        this.handleGetScoresUserResponse(data);
        break;
      case "dcapi.setOrUpdateCustomData.response":
        this.handleSetOrUpdateCustomDataResponse(data);
        break;
      case "dcapi.deleteAllCustomData.response":
        this.handleDeleteAllCustomDataResponse(data);
        break;
      case "dcapi.deleteCustomData.response":
        this.handleDeleteCustomDataResponse(data);
        break;
      case "dcapi.getCustomData.response":
        this.handleGetCustomDataResponse(data);
        break;
    }
  }

  /**
   * Отправка сообщения родительскому окну
   * @param {Object} message - Сообщение для отправки
   */
  sendMessage(message) {
    if (window.parent === window) {
      console.warn("DCAPI: No parent window found");
      return;
    }

    window.parent.postMessage(
      {
        source: "dcapi",
        ...message,
      },
      "*"
    );
  }

  /**
   * Вспомогательная функция для создания Promise-обертки для всех API-вызовов
   * @param {string} type - Тип сообщения для отправки (например, 'dcapi.getResults')
   * @param {number} timeoutMs - Таймаут ожидания ответа в миллисекундах
   * @param {Object} [data] - Данные для отправки с сообщением
   * @returns {Promise<Object>} Promise с данными ответа
   */
  createAPICall(type, timeoutMs = 5000, data = {}) {
    return new Promise((resolve, reject) => {
      const messageId = this.generateMessageId();
      const responseType = `${type}.response`;
      let timeout;

      const responseHandler = (event) => {
        if (
          event.data.type === responseType &&
          event.data.messageId === messageId
        ) {
          window.removeEventListener("message", responseHandler);
          clearTimeout(timeout);

          if (event.data.success) {
            resolve(event.data.data);
          } else {
            reject(new Error(event.data.error || `Error in ${type}`));
          }
        }
      };

      window.addEventListener("message", responseHandler);

      timeout = setTimeout(() => {
        window.removeEventListener("message", responseHandler);
        reject(new Error(`Timeout waiting for ${type} response`));
      }, timeoutMs);

      this.sendMessage({
        type: type,
        messageId: messageId,
        data: data,
      });
    });
  }

  /**
   * @deprecated
   * @param {Promise<any>} promise - Промис, который нужно обернуть
   * @param {Function} callback - Callback функция для получения результата
   */
  withCallback(promise, callback) {
    if (callback) {
      promise
        .then((data) => callback(data))
        .catch((error) => callback(null, error.message));
    }
    return promise;
  }

  /**
   * Получить размер экрана
   * @param {Function} callback - Callback функция
   * @returns {Promise<{width: number, height: number}>}
   */
  getScreenSize(callback) {
    const promise = this.createAPICall("dcapi.getScreenSize");
    return this.withCallback(promise, callback);
  }

  /**
   * Установить результаты выполнения
   * @param {Object} resultsData - Данные результатов
   * @param {Function} callback - Callback функция
   * @returns {Promise<{success: boolean}>}
   */
  setResults(resultsData, callback) {
    const validationError = this.validateResultsData(resultsData);
    if (validationError) {
      const error = `Invalid results data: ${validationError}`;
      return this.withCallback(Promise.reject(new Error(error)), callback);
    }

    const promise = this.createAPICall("dcapi.setResults", 5000, resultsData);
    return this.withCallback(promise, callback);
  }

  /**
   * Получить текущие результаты
   * @param {Function} callback - Callback функция
   * @returns {Promise<Object>}
   */
  getResults(callback) {
    const promise = this.createAPICall("dcapi.getResults");
    return this.withCallback(promise, callback);
  }

  /**
   * Получить баллы пользователя
   * @param {Function} callback - Callback функция
   * @returns {Promise<{maxScore: number|null, passingScore: number|null}>}
   */
  getScores(callback) {
    const promise = this.createAPICall("dcapi.getScoresUser");
    return this.withCallback(promise, callback);
  }

  /**
   * Проверить, пройдено ли задание
   * @param {Function} callback - Callback функция
   * @returns {Promise<boolean>}
   */
  isPassed(callback) {
    const promise = this.createAPICall("dcapi.isPassed");
    return this.withCallback(promise, callback);
  }

  /**
   * Установить кастомные данные
   * @param {Object} customData - Кастомные данные
   * @param {Function} callback - Callback функция
   * @returns {Promise<{success: boolean}>}
   */
  setOrUpdateCustomData(customData, callback) {
    const promise = this.createAPICall(
      "dcapi.setOrUpdateCustomData",
      5000,
      customData
    );
    return this.withCallback(promise, callback);
  }

  /**
   * Удалить все кастомные данные
   * @param {Function} callback - Callback функция
   * @returns {Promise<{success: boolean}>}
   */
  deleteAllCustomData(callback) {
    const promise = this.createAPICall("dcapi.deleteAllCustomData", 5000);
    return this.withCallback(promise, callback);
  }

  /**
   * Удалить кастомные данные по ключу
   * @param {Object} customData - Кастомные данные(ключ)
   * @param {Function} callback - Callback функция
   * @returns {Promise<{success: boolean}>}
   */
  deleteCustomData(customData, callback) {
    const promise = this.createAPICall(
      "dcapi.deleteCustomData",
      5000,
      customData
    );
    return this.withCallback(promise, callback);
  }

  /**
   * Получить данные по ключу из кастомных данных
   * @param {Object} customData -- Кастомные данные(ключ)
   * @param {Function} callback - Callback функция
   * @returns {Promise<Object>}
   */
  getCustomData(customData, callback) {
    const promise = this.createAPICall("dcapi.getCustomData", 5000, customData);
    return this.withCallback(promise, callback);
  }

  /**
   * Валидация данных для setResults
   * @param {Object} data - Данные для валидации
   * @returns {string|null} Ошибка валидации или null если валидация пройдена
   */
  validateResultsData(data) {
    if (!data || typeof data !== "object") {
      return "Data must be an object";
    }

    const validFields = [
      "completion_status",
      "success_status",
      "score_max",
      "score_min",
      "score_raw",
      "score_scaled",
    ];

    for (const field of validFields) {
      if (
        data[field] !== undefined &&
        typeof data[field] !== "string" &&
        typeof data[field] !== "number"
      ) {
        return `Field ${field} must be string or number`;
      }
    }

    if (
      data.completion_status &&
      !["completed", "incomplete", "not attempted", "unknown"].includes(
        data.completion_status
      )
    ) {
      return "Invalid completion_status value";
    }

    if (
      data.success_status &&
      !["passed", "failed", "unknown"].includes(data.success_status)
    ) {
      return "Invalid success_status value";
    }

    const numericFields = [
      "score_max",
      "score_min",
      "score_raw",
      "score_scaled",
    ];
    for (const field of numericFields) {
      if (data[field] !== undefined && isNaN(parseFloat(data[field]))) {
        return `Field ${field} must be a valid number`;
      }
    }

    return null;
  }

  /**
   * Генерация уникального ID для сообщения
   * @returns {string} Уникальный ID
   */
  generateMessageId() {
    return `dcapi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  handleGetScreenSizeResponse(data) {}

  handleGetResultsResponse(data) {}

  handleIsPassedResponse(data) {}

  handleSetResultsResponse(data) {}

  handleGetScoresUserResponse(data) {}

  handleSetOrUpdateCustomDataResponse(data) {}

  handleDeleteAllCustomDataResponse(data) {}

  handleDeleteCustomDataResponse(data) {}

  handleGetCustomDataResponse(data) {}
}

if (typeof window !== "undefined" && !window.dcapi) {
  window.dcapi = new DCAPI();
}
