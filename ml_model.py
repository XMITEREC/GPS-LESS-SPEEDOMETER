"""
ml_model.py
Loads and uses a trained CNN (Keras/TensorFlow) for user mode classification:
e.g., walking, running, driving, train, flight, etc.
"""

import numpy as np
from tensorflow.keras.models import load_model

class UserModeClassifier:
    def __init__(self, model_path='model.h5'):
        # Load the pretrained Keras model
        self.model = load_model(model_path)

        # Mapping from model outputs to human-readable modes
        self.mode_map = {
            0: "walking",
            1: "running",
            2: "driving",
            3: "train",
            4: "flight"
        }

    def predict_mode(self, features_list):
        """
        features_list: A Python list of floats (e.g., [meanAx, meanAy, meanAz, meanGx, ...])

        Returns a string representing the predicted mode.
        """
        arr = np.array(features_list).reshape(1, -1)
        prediction = self.model.predict(arr)
        class_idx = int(np.argmax(prediction, axis=1)[0])
        return self.mode_map.get(class_idx, "unknown")
