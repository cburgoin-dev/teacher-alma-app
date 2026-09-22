import { Alert } from 'react-native';

export function showAccessInfo() {
  Alert.alert('Acceso al curso', 'Este contenido requiere un acceso válido al curso o una membresía Premium. Las opciones de compra todavía no están disponibles en esta versión.');
}
