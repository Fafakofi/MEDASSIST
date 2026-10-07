import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { StatusBar } from "expo-status-bar";
import LoginScreen    from "./src/screens/auth/LoginScreen";
import RegisterScreen from "./src/screens/auth/RegisterScreen";
import MainTabs       from "./src/screens/main/MainTabs";
import ProfileScreen  from "./src/screens/main/ProfileScreen";
import InteractionsScreen from "./src/screens/main/InteractionsScreen";
import RefillScreen from "./src/screens/main/RefillScreen";
import NotificationsScreen from "./src/screens/main/NotificationsScreen";

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login"    component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="Main"     component={MainTabs} />
        <Stack.Screen
          name="ProfileModal"
          component={ProfileScreen}
          options={{
            presentation: "modal",
            headerShown: true,
            headerTitle: "Profile",
            headerBackTitle: "Back",
            headerStyle: { backgroundColor: "#fff" },
            headerTintColor: "#1a3a5c",
          }}
          />
                  <Stack.Screen
            name="Interactions"
            component={InteractionsScreen}
            options={{
              presentation: "modal",
              headerShown: true,
              headerTitle: "Drug Interactions",
              headerBackTitle: "Back",
              headerStyle: { backgroundColor: "#fff" },
              headerTintColor: "#1a3a5c",
            }}
                  />

          <Stack.Screen
            name="Refills"
            component={RefillScreen}
            options={{
              presentation: "modal",
              headerShown: true,
              headerTitle: "Refills",
              headerBackTitle: "Back",
              headerStyle: { backgroundColor: "#fff" },
              headerTintColor: "#1a3a5c",
            }}
          />

          <Stack.Screen
            name="Notifications"
            component={NotificationsScreen}
            options={{
              presentation: "modal",
              headerShown: true,
              headerTitle: "Notifications",
              headerBackTitle: "Back",
              headerStyle: { backgroundColor: "#fff" },
              headerTintColor: "#1a3a5c",
            }}
          />

      </Stack.Navigator>
    </NavigationContainer>
  );
}