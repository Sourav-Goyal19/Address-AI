from flask import Flask, request, jsonify
from index import AddressAISystem

app = Flask(__name__)

system = AddressAISystem("Book2.csv")


@app.route("/process_address", methods=["POST"])
def process_address():
    data = request.get_json()
    address = data.get("address", "")
    result = system.process_address(address)
    return jsonify(result)


@app.route("/bulk_process_addresses", methods=["POST"])
def bulk_process_addresses():
    data = request.get_json()
    addresses = data.get("addresses", [])
    results = system.process_addresses_bulk(addresses)
    return jsonify(results)


if __name__ == "__main__":
    app.run(debug=True)