import json
import pandas as pd
import joblib

try:
    # Muat model dan label encoder
    model = joblib.load("train1_model_v2.joblib")
    le = joblib.load("label_train_v2.joblib")

    # Muat kolom fitur
    with open("selected_gejala_v2.json", "r") as f:
        feature_columns = json.load(f)

    # Baca gejala dari file sementara
    with open("temp_input.json", "r") as f:
        symptoms = json.load(f)

    # Buat kamus input dengan semua fitur diset ke 0
    input_dict = {feat: 0 for feat in feature_columns}

    # Set gejala yang dipilih ke 1
    for symptom in symptoms:
        if symptom in input_dict:
            input_dict[symptom] = 1

    # Buat DataFrame input tanpa nama fitur
    input_vector = [input_dict[col] for col in feature_columns]
    input_df = pd.DataFrame([input_vector])

    # Lakukan prediksi
    predicted_class_index = model.predict(input_df)[0]
    predicted_label = le.inverse_transform([predicted_class_index])[0]

    # Kembalikan hasil
    result = {"success": True, "prediction": predicted_label.upper()}
    print(json.dumps(result))

except Exception as e:
    error_result = {"success": False, "error": str(e)}
    print(json.dumps(error_result))
    print(f"Error: {str(e)}", file=sys.stderr)
