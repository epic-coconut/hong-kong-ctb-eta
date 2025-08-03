import requests

def get_bus_eta(route=None, stop_id=None, company="ctb"):
    base_url = "https://rt.data.gov.hk/v2/transport/citybus"
    
    if stop_id:
        url = f"{base_url}/eta/stop/{stop_id}"
    elif route:
        url = f"{base_url}/eta/route/{company}/{route}"
    else:
        print("Error: Please specify --route or --stop-id")
        return None
    
    try:
        response = requests.get(url)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"API Error: {e}")
        return None

def display_eta(data):
    if not data:
        print("No ETA data available.")
        return
    
    for bus in data["data"]:
        print(f"Route: {bus.get('route', 'N/A')}")
        print(f"Stop: {bus.get('stop', 'N/A')}")
        print(f"Direction: {bus.get('dir', 'N/A')}")
        print(f"ETA: {bus.get('eta', 'N/A')}")
        print("-" * 30)

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Check Hong Kong Citybus/NWFB ETAs")
    parser.add_argument("--route", help="Bus route number (e.g., 10)")
    parser.add_argument("--stop-id", help="Bus stop ID (e.g., 001032)")
    parser.add_argument("--company", default="ctb", help="Bus company (ctb or nwfb)")
    
    args = parser.parse_args()
    eta_data = get_bus_eta(args.route, args.stop_id, args.company)
    display_eta(eta_data)
