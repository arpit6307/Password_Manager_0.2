import * as faceapi from 'face-api.js';
import * as tf from '@tensorflow/tfjs';

// Ensure tfjs backend is initialized
(async () => {
    await tf.setBackend('webgl');
    await tf.ready();
})();

let modelsLoaded = false;
const MODEL_URL = '/models';

export const loadModels = async () => {
    if (modelsLoaded) {
        return;
    }
    try {
        await Promise.all([
            faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
            faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
            faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
        ]);
        modelsLoaded = true;
        console.log("FaceAPI Models Loaded");
    } catch (error) {
        console.error("Error loading FaceAPI models:", error);
    }
};

export const getFullFaceDescription = async (blob, inputSize = 512) => {
    let img = await faceapi.fetchImage(blob);
    const detections = await faceapi
        .detectAllFaces(img, new faceapi.TinyFaceDetectorOptions({ inputSize }))
        .withFaceLandmarks()
        .withFaceDescriptors();
    return detections;
};

export const createFaceMatcher = (faceDescriptors) => {
    if (!faceDescriptors || faceDescriptors.length === 0) {
        return null;
    }
    // Convert plain array back to Float32Array
    const labeledDescriptors = [
        new faceapi.LabeledFaceDescriptors(
            'me',
            [Float32Array.from(faceDescriptors)]
        )
    ];
    
    // ====================================================================
    // ⭐️ FIX 1: Humne threshold ko 0.6 se 0.5 kar diya hai (Strict matching)
    // ====================================================================
    return new faceapi.FaceMatcher(labeledDescriptors, 0.5); 
};