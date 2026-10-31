import React from 'react';
import {SafeAreaView,StatusBar,View,Text,ScrollView,Pressable,StyleSheet,Alert} from 'react-native';
const items=["Delivery requests","Active deliveries","Live GPS","Wallet & commission"];
export default function App(){
 return <SafeAreaView style={styles.page}><StatusBar barStyle="dark-content"/><ScrollView contentContainerStyle={styles.content}>
  <Text style={styles.brand}>ad<Text style={styles.pink}>panda</Text> 🐼</Text>
  <Text style={styles.tag}>RIDER APP · PREVIEW</Text>
  <Text style={styles.heading}>Rider workspace</Text>
  <Text style={styles.subtitle}>Deliveries, GPS availability, COD and AdPanda settlement.</Text>
  <View style={styles.panel}><Text style={styles.panelTitle}>Workspace</Text>{items.map((label,index)=><Pressable key={label} style={styles.action} onPress={()=>Alert.alert('Coming in integration phase',label+' will use the secure AdPanda mobile API.')}><Text style={styles.actionText}>{label}</Text><Text style={styles.arrow}>›</Text></Pressable>)}</View>
  <Text style={styles.note}>Starter app only. Payments, orders and account login are intentionally disabled until dedicated mobile token authentication and role-secured APIs are connected. No customer or payment data is stored here.</Text>
 </ScrollView></SafeAreaView>;
}
const styles=StyleSheet.create({page:{flex:1,backgroundColor:'#F5F6FA'},content:{paddingHorizontal:22,paddingTop:32,paddingBottom:55},brand:{fontWeight:'900',fontSize:30,color:'#242036'},pink:{color:'#E91672'},tag:{marginTop:34,fontSize:11,letterSpacing:1.8,fontWeight:'900',color:'#E91672'},heading:{marginTop:10,fontSize:30,fontWeight:'800',color:'#222038'},subtitle:{fontSize:15,lineHeight:23,color:'#808397',marginTop:9,marginBottom:28},panel:{backgroundColor:'#fff',borderRadius:18,padding:18,borderWidth:1,borderColor:'#E6E8EE'},panelTitle:{fontWeight:'800',fontSize:17,color:'#292538',marginBottom:10},action:{paddingVertical:17,borderBottomWidth:1,borderColor:'#F0F0F3',flexDirection:'row',justifyContent:'space-between',alignItems:'center'},actionText:{fontSize:15,fontWeight:'650',color:'#292638'},arrow:{fontSize:22,color:'#E91672'},note:{marginTop:20,color:'#828596',fontSize:12,lineHeight:20}});
