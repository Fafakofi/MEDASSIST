import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Text } from "react-native";
import HomeScreen        from "./HomeScreen";
import MedicationsScreen from "./MedicationsScreen";
import ScheduleScreen    from "./ScheduleScreen";
import SymptomsScreen    from "./SymptomsScreen";

const Tab = createBottomTabNavigator();

const icons = {
  Home:      { active: "🏠", inactive: "🏡" },
  Schedule:  { active: "📅", inactive: "📅" },
  Meds:      { active: "💊", inactive: "💊" },
  Symptoms:  { active: "🔴", inactive: "⭕" },
};

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused }) => (
          <Text style={{ fontSize: 20 }}>
            {focused ? icons[route.name]?.active : icons[route.name]?.inactive}
          </Text>
        ),
        tabBarActiveTintColor:   "#1a3a5c",
        tabBarInactiveTintColor: "#9ca3af",
        tabBarLabelStyle: { fontSize: 10, marginBottom: 4 },
    tabBarStyle: {
        backgroundColor: "#fff",
        borderTopColor:  "#f3f4f6",
        borderTopWidth:  1,
        height:          70,
        paddingTop:      6,
        paddingBottom:   10,
        position:        "absolute",
        bottom:          2,
        left:            16,
        right:           16,
        borderRadius:    20,
        shadowColor:     "#000",
        shadowOpacity:   0.08,
        shadowRadius:    12,
        shadowOffset:    { width: 0, height: 4 },
        elevation:       8,
      },
      })}
    >
      <Tab.Screen name="Home"     component={HomeScreen} />
      <Tab.Screen name="Schedule" component={ScheduleScreen} />
      <Tab.Screen name="Meds"     component={MedicationsScreen} />
      <Tab.Screen name="Symptoms" component={SymptomsScreen} />
    </Tab.Navigator>
  );
}