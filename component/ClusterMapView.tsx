import { TouchableOpacity, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Camera, Map, Marker } from '@maplibre/maplibre-react-native';
import { MAP_STYLE_URL, DEFAULT_CENTER, ZOOM_DEFAULT } from './maps/mapConstants';
import { formatSportDisplay } from '@/src/utils/sport-type.util';

interface SportType {
  id: number;
  name: string;
}

interface Cluster {
  id: number;
  name: string;
  street: string;
  district: string;
  city: string;
  latitude?: number | null;
  longitude?: number | null;
  open_time: string;
  close_time: string;
  sport_types?: SportType[];
}

interface Props {
  clusters: Cluster[];
  userLocation: { latitude: number; longitude: number } | null;
  selectedCluster: Cluster | null;
  focusedCoords: [number, number] | null;
  onMarkerPress: (cluster: any) => void;
  onDismiss: () => void;
  onViewDetail: (cluster: any) => void | Promise<void>;
  onBook: (clusterId: number, clusterName: string) => void | Promise<void>;
}

export default function ClusterMapView({
  clusters,
  userLocation,
  selectedCluster,
  focusedCoords,
  onMarkerPress,
  onDismiss,
  onViewDetail,
  onBook,
}: Props) {
  const mapCenter: [number, number] = focusedCoords
    ?? (userLocation ? [userLocation.longitude, userLocation.latitude] : DEFAULT_CENTER);
  const mapZoom = focusedCoords ? 15 : (userLocation ? 13 : ZOOM_DEFAULT);

  return (
    <View style={{ flex: 1 }}>
      <Map
        mapStyle={MAP_STYLE_URL}
        style={{ flex: 1 }}
        logo={false}
        touchRotate={false}
        touchPitch={false}
      >
        <Camera center={mapCenter} zoom={mapZoom} duration={400} />

        {/* User location dot */}
        {userLocation && (
          <Marker lngLat={[userLocation.longitude, userLocation.latitude]} anchor="center">
            <View
              style={{
                width: 18,
                height: 18,
                borderRadius: 9,
                backgroundColor: '#2563eb',
                borderWidth: 3,
                borderColor: 'white',
              }}
            />
          </Marker>
        )}

        {/* Cluster pins */}
        {clusters
          .filter(c => typeof c.latitude === 'number' && typeof c.longitude === 'number')
          .map(cluster => (
            <Marker
              key={cluster.id}
              lngLat={[cluster.longitude as number, cluster.latitude as number]}
              anchor="bottom"
            >
              <TouchableOpacity onPress={() => onMarkerPress(cluster)} hitSlop={8}>
                <Ionicons
                  name="location"
                  size={38}
                  color={selectedCluster?.id === cluster.id ? '#7c3aed' : '#DC2626'}
                />
              </TouchableOpacity>
            </Marker>
          ))}
      </Map>

      {/* Bottom popup card */}
      {selectedCluster && (
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: 'white',
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: 16,
            paddingBottom: 28,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.12,
            shadowRadius: 10,
            elevation: 12,
          }}
        >
          <TouchableOpacity
            style={{ position: 'absolute', top: 14, right: 16, zIndex: 1 }}
            onPress={onDismiss}
            hitSlop={8}
          >
            <Ionicons name="close-circle" size={26} color="#9ca3af" />
          </TouchableOpacity>

          <Text
            style={{ fontWeight: '800', fontSize: 20, color: '#060b28', marginBottom: 4, paddingRight: 36 }}
            numberOfLines={2}
          >
            {selectedCluster.name}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 }}>
            <Ionicons name="location-outline" size={14} color="#6b7280" style={{ marginTop: 2 }} />
            <Text style={{ color: '#6b7280', fontSize: 13, marginLeft: 4, flex: 1 }} numberOfLines={2}>
              {selectedCluster.street}, {selectedCluster.district}, {selectedCluster.city}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <Ionicons name="time-outline" size={14} color="#6b7280" />
            <Text style={{ color: '#6b7280', fontSize: 13, marginLeft: 4 }}>
              {selectedCluster.open_time} - {selectedCluster.close_time}
            </Text>
          </View>

          {(selectedCluster.sport_types || []).length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 }}>
              {(selectedCluster.sport_types || []).map(sport => (
                <View
                  key={sport.id}
                  style={{
                    backgroundColor: '#eff6ff',
                    borderWidth: 1,
                    borderColor: '#bfdbfe',
                    borderRadius: 20,
                    paddingHorizontal: 10,
                    paddingVertical: 3,
                    marginRight: 6,
                    marginBottom: 4,
                  }}
                >
                  <Text style={{ color: '#1d4ed8', fontSize: 12, fontWeight: '600' }}>
                    {formatSportDisplay(sport.name, sport.id)}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              style={{
                flex: 1,
                borderWidth: 1.5,
                borderColor: '#374151',
                borderRadius: 12,
                paddingVertical: 11,
                alignItems: 'center',
              }}
              onPress={() => onViewDetail(selectedCluster)}
            >
              <Text style={{ color: '#374151', fontWeight: '600', fontSize: 15 }}>Xem chi tiết</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: '#2563eb',
                borderRadius: 12,
                paddingVertical: 11,
                alignItems: 'center',
              }}
              onPress={() => onBook(selectedCluster.id, selectedCluster.name)}
            >
              <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>Đặt ngay</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}
