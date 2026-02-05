from rest_framework import status
from rest_framework.viewsets import ModelViewSet
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny

from .documents import Track
from .serializers import TrackSerializer
from apps.users.permissions import IsTeacher


class TrackViewSet(ModelViewSet):
    serializer_class = TrackSerializer
    permission_classes = [IsAuthenticated]
    def get_queryset(self):
        # Return tracks filtered by visibility. If a track has empty `visible_group_ids`, it's public.
        try:
            request = self.request
        except Exception:
            request = None

        base_qs = Track.objects.order_by("order")

        # If there's no request or anonymous user, show only public tracks (visible_group_ids empty)
        if not request or not getattr(request, "user", None) or not getattr(request.user, "id", None):
            return base_qs.filter(__raw__={"$or": [{"visible_group_ids": {"$exists": False}}, {"visible_group_ids": []}]})

        # Authenticated user: collect their group ids and include tracks visible to any of them or public tracks
        user = request.user
        user_group_ids = []
        if getattr(user, "group_id", None):
            user_group_ids.append(str(user.group_id))
        if getattr(user, "group_ids", None):
            user_group_ids.extend([str(g) for g in user.group_ids])

        if not user_group_ids:
            return base_qs.filter(__raw__={"$or": [{"visible_group_ids": {"$exists": False}}, {"visible_group_ids": []}]})

        return base_qs.filter(__raw__={
            "$or": [
                {"visible_group_ids": {"$exists": False}},
                {"visible_group_ids": []},
                {"visible_group_ids": {"$in": user_group_ids}},
            ]
        })

    def get_permissions(self):
        # Allow anonymous users to list and retrieve tracks so site navigation works
        if self.action in ["list", "retrieve"]:
            return [AllowAny()]
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsAuthenticated(), IsTeacher()]
        return [IsAuthenticated()]

    def get_object(self):
        from bson import ObjectId
        pk = self.kwargs.get("pk")
        # Try to lookup by mongo ObjectId first, then by public_id
        try:
            return Track.objects.get(id=ObjectId(pk))
        except Exception:
            # fallback: try public_id
            try:
                return Track.objects.get(public_id=pk)
            except Exception:
                raise

    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        ser = self.get_serializer(qs, many=True)
        return Response(ser.data)

    def retrieve(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
        except Track.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        ser = self.get_serializer(instance, context={"request": request})
        return Response(ser.data)

    def create(self, request, *args, **kwargs):
        ser = self.get_serializer(data=request.data)
        ser.is_valid(raise_exception=True)
        track = ser.save()
        return Response(self.get_serializer(track).data, status=status.HTTP_201_CREATED)
