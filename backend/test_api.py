import requests
import io

# Configuration
# BASE_URL = "http://localhost:8090"
BASE_URL = "http://127.0.0.1:8123"
HEADERS = {"X-User-Email": "kira@example.com"} # Must match a seeded user

# Helper function to print colored, formatted results
def run_test(name, method, endpoint, expected_status, **kwargs):
    url = f"{BASE_URL}{endpoint}"
    
    # Merge global headers with request-specific headers
    headers = kwargs.pop('headers', {})
    headers.update(HEADERS)
    
    response = requests.request(method, url, headers=headers, **kwargs)
    
    if response.status_code == expected_status:
        print(f"✅ PASS | {method.upper().ljust(6)} | {endpoint} | ({name})")
        return response.json() if response.content else None
    else:
        print(f"❌ FAIL | {method.upper().ljust(6)} | {endpoint} | ({name})")
        print(f"   -> Expected: {expected_status}, Got: {response.status_code}")
        print(f"   -> Response: {response.text}")
        return None

def main():
    print("🚀 Starting Trello Clone API Integration Tests...\n")
    print("="*60)

    # 1. Health Check
    run_test("Health Check", "GET", "/health", 200)

    # 2. Users
    users = run_test("Get All Users", "GET", "/api/v1/users/", 200)
    if not users:
        print("🛑 FATAL: No users found. Did you run seed.py?")
        return
    user_id = users[0]['id']

    # 3. Boards
    # 3. Boards
    board = run_test("Create Board", "POST", "/api/v1/boards/", 201, json={"title": "Test Board", "background_color": "#111111"})
    
    # Failsafe to print the actual backend response if it bugs out again
    if not board or 'id' not in board:
        print(f"🛑 CRITICAL DATA MISSING. Backend returned: {board}")
        return
        
    board_id = board['id']
    run_test("Get My Boards", "GET", "/api/v1/boards/", 200)
    run_test("Add Board Member", "POST", f"/api/v1/boards/{board_id}/members", 201, json={"user_id": user_id, "role": "editor"})

    # 4. Lists
    list1 = run_test("Create List 1", "POST", "/api/v1/lists/", 201, json={"title": "To Do", "board_id": board_id, "position": 1000.0})
    list1_id = list1['id']
    list2 = run_test("Create List 2", "POST", "/api/v1/lists/", 201, json={"title": "Done", "board_id": board_id, "position": 2000.0})
    list2_id = list2['id']
    run_test("Update List", "PATCH", f"/api/v1/lists/{list1_id}", 200, json={"title": "To Do (Updated)"})

    # 5. Cards Core
    card = run_test("Create Card", "POST", "/api/v1/cards/", 201, json={"title": "Test Card", "list_id": list1_id, "position": 1000.0})
    card_id = card['id']
    run_test("Update Card Details", "PATCH", f"/api/v1/cards/{card_id}", 200, json={"description": "Test description", "is_archived": False})
    run_test("Move Card (DnD)", "PUT", f"/api/v1/cards/{card_id}/move", 200, json={"new_list_id": list2_id, "new_position": 1500.0})

    # 6. Labels
    label = run_test("Create Label", "POST", "/api/v1/labels/", 201, json={"name": "Urgent", "color_code": "#ff0000"})
    label_id = label['id']
    run_test("Get All Labels", "GET", "/api/v1/labels/", 200)
    run_test("Update Label", "PATCH", f"/api/v1/labels/{label_id}", 200, json={"name": "Super Urgent"})
    run_test("Add Label to Card", "POST", f"/api/v1/cards/{card_id}/labels/{label_id}", 201)

    # 7. Card Collaboration
    run_test("Assign Member to Card", "POST", f"/api/v1/cards/{card_id}/members/{user_id}", 201)
    
    checklist = run_test("Add Checklist Item", "POST", f"/api/v1/cards/{card_id}/checklists", 201, json={"title": "Task 1"})
    checklist_id = checklist['id']
    run_test("Toggle Checklist Item", "PATCH", f"/api/v1/cards/{card_id}/checklists/{checklist_id}", 200, json={"is_completed": True})
    
    run_test("Add Comment", "POST", f"/api/v1/cards/{card_id}/comments", 201, json={"content": "This is a test comment."})

    # 8. File Attachments (Simulating Multipart Form Data)
    dummy_file = io.BytesIO(b"This is a dummy text file for testing.")
    dummy_file.name = "test_upload.txt"
    files = {"file": ("test_upload.txt", dummy_file, "text/plain")}
    # Note: requests handles the content-type automatically for files
    run_test("Upload Attachment", "POST", f"/api/v1/cards/{card_id}/attachments", 201, files=files)

    # 9. Get Full Board State (Verifying Eager Loading)
    run_test("Get Board State (Fetch All)", "GET", f"/api/v1/boards/{board_id}", 200)

    # 10. Teardown / Cleanup
    print("\n🧹 Starting Teardown...")
    run_test("Remove Label from Card", "DELETE", f"/api/v1/cards/{card_id}/labels/{label_id}", 204)
    run_test("Remove Member from Card", "DELETE", f"/api/v1/cards/{card_id}/members/{user_id}", 204)
    run_test("Delete Checklist Item", "DELETE", f"/api/v1/cards/{card_id}/checklists/{checklist_id}", 204)
    run_test("Delete Card", "DELETE", f"/api/v1/cards/{card_id}", 204)
    run_test("Delete List", "DELETE", f"/api/v1/lists/{list1_id}", 204)
    run_test("Delete Label", "DELETE", f"/api/v1/labels/{label_id}", 204)

    print("="*60)
    print("🎉 ALL TESTS EXECUTED.")

if __name__ == "__main__":
    main()