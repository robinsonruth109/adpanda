import React,{useEffect,useState} from 'react';
import * as SecureStore from 'expo-secure-store';
import {SafeAreaView,StatusBar,View,Text,ScrollView,Pressable,StyleSheet,Alert,TextInput,ActivityIndicator} from 'react-native';
const items=["Incoming orders","Products & menu","Merchant wallet","Shop settings"];
const API='https://adpanda.food/api/mobile/auth';
const KEY='adpanda_merchant_token';
export default function App(){
 const [phone,setPhone]=useState(''),[password,setPassword]=useState(''),[token,setToken]=useState<string|null>(null),[account,setAccount]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[boot,setBoot]=useState(true);
 useEffect(()=>{let active=true;async function restore(){try{const stored=await SecureStore.getItemAsync(KEY);if(stored){const response=await fetch(API+'/me',{headers:{Authorization:'Bearer '+stored}});if(response.ok){const data=await response.json();if(active){setToken(stored);setAccount(data.user.name)}}else await SecureStore.deleteItemAsync(KEY)}}catch{}finally{if(active)setBoot(false)}}void restore();return ()=>{active=false}},[]);
 async function login(){if(busy)return;setBusy(true);setError('');try{
  const response=await fetch(API+'/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone:phone.trim(),password,app:'merchant'})});
  const data=await response.json();if(!response.ok)throw new Error(data.error||'Login failed');
  await SecureStore.setItemAsync(KEY,data.token);setToken(data.token);setAccount(data.user.name);setPassword('');
 }catch(e){setError(e instanceof Error?e.message:'Connection failed')}finally{setBusy(false)}}
 async function logout(){if(token){try{await fetch(API+'/logout',{method:'POST',headers:{Authorization:'Bearer '+token}})}catch{}}await SecureStore.deleteItemAsync(KEY);setToken(null);setAccount('')}

 return <SafeAreaView style={styles.page}><StatusBar barStyle="dark-content"/><ScrollView contentContainerStyle={styles.content}>
  <Text style={styles.brand}>ad<Text style={styles.pink}>panda</Text> 🐼</Text>
  <Text style={styles.tag}>MERCHANT APP · PREVIEW</Text>
  <Text style={styles.heading}>Merchant workspace</Text>
  <Text style={styles.subtitle}>Manage orders, dispatch riders, products and earnings.</Text>
  {boot?<ActivityIndicator color="#E91672"/>:!token?<View style={styles.panel}><Text style={styles.panelTitle}>Sign in with mobile and password</Text>
  <TextInput style={styles.field} keyboardType="phone-pad" placeholder="01XXXXXXXXX" value={phone} onChangeText={setPhone} maxLength={11}/>
  <TextInput style={styles.field} placeholder="Password" secureTextEntry value={password} onChangeText={setPassword}/>
  {error?<Text style={styles.error}>{error}</Text>:null}
  <Pressable onPress={()=>void login()} disabled={busy} style={styles.primary}><Text style={styles.primaryText}>{busy?'Signing in…':'Sign in'}</Text></Pressable>
  <Text style={styles.note}>Use your existing AdPanda merchant account. No OTP.</Text>
 </View>:<><View style={styles.panel}><Text style={styles.panelTitle}>Welcome, {account}</Text><Pressable onPress={()=>void logout()}><Text style={styles.logout}>Log out</Text></Pressable></View><View style={styles.panel}><Text style={styles.panelTitle}>Workspace</Text>{items.map((label,index)=><Pressable key={label} style={styles.action} onPress={()=>Alert.alert('Coming in integration phase',label+' will use the secure AdPanda mobile API.')}><Text style={styles.actionText}>{label}</Text><Text style={styles.arrow}>›</Text></Pressable>)}</View></>}
  <Text style={styles.note}>Mobile login preview. Login API must first be deployed to the backend; orders, payments and other workspace actions are not connected yet.</Text>
 </ScrollView></SafeAreaView>;
}
const styles=StyleSheet.create({field:{borderWidth:1,borderColor:'#E1E3E9',borderRadius:10,padding:13,marginTop:12,fontSize:15,color:'#28243B'},primary:{marginTop:15,padding:15,borderRadius:11,backgroundColor:'#E91672',alignItems:'center'},primaryText:{color:'#fff',fontWeight:'800'},error:{color:'#b91c1c',marginTop:10},logout:{color:'#E91672',fontWeight:'800',marginTop:10},page:{flex:1,backgroundColor:'#F5F6FA'},content:{paddingHorizontal:22,paddingTop:32,paddingBottom:55},brand:{fontWeight:'900',fontSize:30,color:'#242036'},pink:{color:'#E91672'},tag:{marginTop:34,fontSize:11,letterSpacing:1.8,fontWeight:'900',color:'#E91672'},heading:{marginTop:10,fontSize:30,fontWeight:'800',color:'#222038'},subtitle:{fontSize:15,lineHeight:23,color:'#808397',marginTop:9,marginBottom:28},panel:{backgroundColor:'#fff',borderRadius:18,padding:18,borderWidth:1,borderColor:'#E6E8EE'},panelTitle:{fontWeight:'800',fontSize:17,color:'#292538',marginBottom:10},action:{paddingVertical:17,borderBottomWidth:1,borderColor:'#F0F0F3',flexDirection:'row',justifyContent:'space-between',alignItems:'center'},actionText:{fontSize:15,fontWeight:'650',color:'#292638'},arrow:{fontSize:22,color:'#E91672'},note:{marginTop:20,color:'#828596',fontSize:12,lineHeight:20}});
