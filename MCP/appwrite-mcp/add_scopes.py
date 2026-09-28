import requests, json

ep   = "https://nyc.cloud.appwrite.io/v1"
proj = "6ab9d0f3001efdac0518"
key  = "standard_3a17607597e60c73ab9e02fc8749e99876e97b136f5c8c493be0c056a56879085c2276b737eaa4c61066dd46620abb540538625df262c369f932be7778dd5ddd62c1d47b69f9bfabc9c9242578b394339187b9cfae52f8994e08eb26dd7959fb939d06358546782bee4297dfc2f67b068c7e59b5c4d71b69d3b5553e5a37cb8c"
h    = {"X-Appwrite-Project": proj, "X-Appwrite-Key": key, "Content-Type": "application/json"}

# Obtem escopos atuais
r = requests.get(f"{ep}/projects/{proj}/keys", headers=h, timeout=10)
keys_data = r.json()
entry      = keys_data["keys"][0]
key_id     = entry["$id"]
current    = entry["scopes"]

# Escopos legados necessarios
missing = [
    "collections.read", "collections.write",
    "attributes.read",  "attributes.write",
    "indexes.read",     "indexes.write",
    "documents.read",   "documents.write",
]
new_scopes = list(set(current + missing))
print(f"Key ID: {key_id}")
print(f"Adicionando escopos: {missing}")

# Atualiza a key
body = {"name": "dioAula", "scopes": new_scopes}
r2 = requests.put(f"{ep}/projects/{proj}/keys/{key_id}", headers=h, json=body, timeout=10)
print(f"Update status: {r2.status_code}")
if r2.status_code == 200:
    updated = r2.json()
    ok = all(s in updated["scopes"] for s in missing)
    print(f"Escopos legados presentes: {ok}")
    print("collections.read:", "collections.read" in updated["scopes"])
    print("collections.write:", "collections.write" in updated["scopes"])
else:
    print(r2.json())
