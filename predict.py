import sys
import json
import joblib
import numpy as np
from sklearn.tree import DecisionTreeClassifier

try:
    # Load the model
    model = joblib.load("train1_model_v2.joblib")

    # Get symptoms from command line argument
    symptoms = json.loads(sys.argv[1])

    # Load label mapping
    label_mapping = joblib.load("label_train_v2.joblib")

    # Create feature vector (1 for selected symptoms, 0 for others)
    with open("selected_gejala_v2.json", "r") as f:
        all_symptoms = json.load(f)

    # Initialize feature vector with zeros
    feature_vector = np.zeros(len(all_symptoms))

    # Set 1 for selected symptoms
    for symptom in symptoms:
        if symptom in all_symptoms:
            idx = all_symptoms.index(symptom)
            feature_vector[idx] = 1

    # Make prediction
    prediction = model.predict([feature_vector])
    predicted_label = label_mapping[prediction[0]]

    # Return result as JSON
    result = {"success": True, "prediction": predicted_label}
    print(json.dumps(result))

except Exception as e:
    error_result = {"success": False, "error": str(e)}
    print(json.dumps(error_result))
