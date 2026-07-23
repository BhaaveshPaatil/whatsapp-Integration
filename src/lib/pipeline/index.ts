/**
 * Async message → AI → task pipeline.
 *
 * Flow: Connector.normalize → save raw message → queue → worker →
 * Gemini structured intent → confidence route → task actions → analytics events.
 */
export { whatsappConnector, getConnector, registerConnector } from "./connectors";
export { processQueueJob, enqueueWorkerProcessing } from "./worker";
export { publishEvent, onEvent } from "./events";
export { routeByConfidence, CONFIDENCE_AUTO, CONFIDENCE_REVIEW } from "./confidence";
