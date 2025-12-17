import json
from decimal import Decimal
from uuid import uuid4

import boto3

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table("ItemsTable")

def lambda_handler(event, context):
    http_method = event.get("httpMethod") or event.get("requestContext", {}).get("http", {}).get("method")
    path = event.get("path") or event.get("rawPath") or ""
    route_key = event.get("routeKey") or event.get("requestContext", {}).get("routeKey") or ""
    resource = event.get("resource") or ""
    path_params = event.get("pathParameters") or {}
    item_id = path_params.get("id")

    print(f"Received event: {json.dumps(event)}")
    print(f"HTTP Method: {http_method}, Path: {path}, Item ID: {item_id}")

    # trigger github actions deployment workflow123erfteert now change again 123 okay
    # Allow POST to the items collection for both REST and HTTP APIs without brittle path matching.
    is_items_collection = (
        path.endswith("/items")
        or path == "/items"
        or resource.endswith("/items")
        or route_key.endswith("/items")
    )

    # Fallback: if no path parameter was passed but the path clearly contains an id, extract it.
    if not item_id and "/items/" in path:
        item_id = path.rstrip("/").split("/")[-1]

    # CREATE item
    if http_method == "POST" and is_items_collection:
        body = json.loads(event["body"])
        item_id = str(uuid4())
        item = {"id": item_id, **body}
        table.put_item(Item=item)
        return respond(200, {"message": "Item created", "id": item_id})

    # READ item
    if http_method == "GET" and item_id:
        result = table.get_item(Key={"id": item_id})
        return respond(200, result.get("Item", {}))

    # UPDATE item
    if http_method == "PUT" and item_id:
        body = json.loads(event["body"])
        body["id"] = item_id
        table.put_item(Item=body)
        return respond(200, {"message": "Item updated"})

    # DELETE item
    if http_method == "DELETE" and item_id:
        table.delete_item(Key={"id": item_id})
        return respond(200, {"message": "Item deleted"})

    return respond(400, {"error": "Invalid request"})


class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            # Convert DynamoDB Decimal back to int/float for JSON serialization.
            return int(obj) if obj % 1 == 0 else float(obj)
        return super().default(obj)


def respond(status, body):
    return {
        "statusCode": status,
        "headers": {"Content-Type": "application/json", "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
                    "Access-Control-Allow-Methods": "OPTIONS,GET,POST,PUT,DELETE"
                    },
        "body": json.dumps(body, cls=DecimalEncoder),
    }
