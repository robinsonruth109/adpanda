import React,{useEffect,useState} from 'react';
import * as SecureStore from 'expo-secure-store';
import {ActivityIndicator,Alert,Pressable,ScrollView,StatusBar,StyleSheet,Text,TextInput,View,Linking,RefreshControl} from 'react-native';
import {SafeAreaProvider,SafeAreaView} from 'react-native-safe-area-context';

type Screen='welcome'|'login'|'register'|'home';
type Tab='Home'|'Explore'|'Orders'|'Account';
type StoreType='ALL'|'FOOD'|'GROCERY'|'STATIONERY';
type Store={id:string;name:string;slug:string;description:string|null;storeType:'FOOD'|'GROCERY'|'STATIONERY';acceptingOrders:boolean;categories:{name:string;items:{id:string;available:boolean}[]}[]};
const API='https://adpanda.food/api/mobile/auth';
const KEY='adpanda_customer_token';

function Pill({label,onPress,outline=false}:{label:string;onPress:()=>void;outline?:boolean}){
 return <Pressable accessibilityRole="button" onPress={onPress} style={[styles.button,outline&&styles.buttonOutline]}><Text style={[styles.buttonText,outline&&styles.outlineText]}>{label}</Text></Pressable>;
}
export default function App(){
 const [screen,setScreen]=useState<Screen>('welcome');
 const [tab,setTab]=useState<Tab>('Home');
 const [storeType,setStoreType]=useState<StoreType>('ALL'),[stores,setStores]=useState<Store[]>([]),[loadingStores,setLoadingStores]=useState(false),[storeError,setStoreError]=useState(''),[refreshTick,setRefreshTick]=useState(0);
 const [phone,setPhone]=useState(''),[password,setPassword]=useState(''),[name,setName]=useState('');
 const [token,setToken]=useState<string|null>(null),[account,setAccount]=useState('');
 const [busy,setBusy]=useState(false),[boot,setBoot]=useState(true),[error,setError]=useState('');
 useEffect(()=>{let active=true;(async()=>{try{const stored=await SecureStore.getItemAsync(KEY);if(stored){const response=await fetch(API+'/me',{headers:{Authorization:'Bearer '+stored}});if(response.ok){const data=await response.json();if(active){setToken(stored);setAccount(data.user.name);setScreen('home')}}else await SecureStore.deleteItemAsync(KEY)}}catch{}finally{if(active)setBoot(false)}})();return ()=>{active=false}},[]);
 useEffect(()=>{if(screen!=='home'||tab!=='Explore')return;let active=true;const controller=new AbortController();(async()=>{setLoadingStores(true);setStoreError('');try{const response=await fetch('https://adpanda.food/api/kitchens',{signal:controller.signal,headers:{Accept:'application/json'}});if(!response.ok)throw Error('Store list unavailable (HTTP '+response.status+')');const result=await response.json();if(!result||!Array.isArray(result.kitchens))throw Error('Invalid store list');if(active)setStores(result.kitchens)}catch(e){if(active)setStoreError('Cannot load shops. Check your internet and try again.')}finally{if(active)setLoadingStores(false)}})();return()=>{active=false;controller.abort()}},[screen,tab,refreshTick]);
 const browse=(kind:StoreType='ALL')=>{setStoreType(kind);setTab('Explore')};
 const openStore=(slug:string)=>{void Linking.openURL('https://adpanda.food/kitchens/'+encodeURIComponent(slug)).catch(()=>Alert.alert('Unavailable','Unable to open the shop right now.'))};
 const go=(next:Screen)=>{setError('');setScreen(next)};
 const login=async()=>{if(busy)return;setError('');if(!/^01[3-9]\d{8}$/.test(phone.trim())||!password){setError('সঠিক ১১ ডিজিটের ফোন নম্বর ও পাসওয়ার্ড দিন।');return}
 setBusy(true);try{const response=await fetch(API+'/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone:phone.trim(),password,app:'customer'})});
 const data=await response.json();if(!response.ok)throw Error(data.error||'Unable to log in');
 await SecureStore.setItemAsync(KEY,data.token);setToken(data.token);setAccount(data.user.name);setPassword('');setTab('Home');go('home');
 }catch(e){setError(e instanceof Error?e.message:'Connection failed. Mobile API may not be deployed yet.')}finally{setBusy(false)}};
 const logout=async()=>{if(token){try{await fetch(API+'/logout',{method:'POST',headers:{Authorization:'Bearer '+token}})}catch{}}await SecureStore.deleteItemAsync(KEY);setToken(null);setAccount('');setTab('Home');go('welcome')};
 const guest=()=>{setTab('Home');go('home')};
 const register=()=>{if(!name.trim()||!/^01[3-9]\d{8}$/.test(phone.trim())||password.length<10){setError('Name, ১১ ডিজিটের ফোন এবং কমপক্ষে ১০ অক্ষরের password দিন।');return}
 setError('Registration API is not connected to the mobile app yet. You can continue as guest.');};
 const header=<View style={styles.header}><Text style={styles.logo}>ad<Text style={styles.pink}>panda</Text> 🐼</Text><Text style={styles.headerLabel}>{screen==='home'?'ALAMDANGA, CHUADANGA':'FOOD · GROCERY · STATIONERY'}</Text></View>;
 return <SafeAreaProvider><SafeAreaView style={styles.safe} edges={['top','bottom']}><StatusBar barStyle="dark-content" backgroundColor="#FFFFFF"/>{header}
 {boot?<View style={styles.center}><ActivityIndicator color="#E91672" size="large"/></View>:
 screen==='welcome'?<ScrollView contentContainerStyle={styles.welcome}>
  <View style={styles.heroOrbs}><Text style={styles.heroEmoji}>🍔</Text><Text style={styles.heroAccent}>🥟</Text><Text style={styles.heroDrink}>🥤</Text></View>
  <Text style={styles.eyebrow}>FRESH FROM YOUR NEIGHBOURHOOD</Text><Text style={styles.bigTitle}>Everything you love, delivered to your door.</Text>
  <Text style={styles.paragraph}>Order meals, groceries and essentials from local shops in Alamdanga.</Text>
  <View style={styles.welcomeButtons}>
   <Pill label="Create account" onPress={()=>go('register')}/>
   <Pill label="Log in" outline onPress={()=>go('login')}/>
   <Pressable style={styles.guest} onPress={guest}><Text style={styles.guestText}>Continue as Guest  →</Text></Pressable>
  </View>
  <Text style={styles.smallInfo}>No login needed to explore shops and products. Cash on delivery.</Text>
 </ScrollView>:
 screen==='login'||screen==='register'?<ScrollView contentContainerStyle={styles.formScreen} keyboardShouldPersistTaps="handled">
  <Pressable onPress={()=>go('welcome')}><Text style={styles.back}>‹  Back</Text></Pressable>
  <Text style={styles.eyebrow}>{screen==='login'?'WELCOME BACK':'JOIN ADPANDA'}</Text>
  <Text style={styles.formTitle}>{screen==='login'?'Log in to AdPanda':'Create your account'}</Text>
  <Text style={styles.paragraph}>{screen==='login'?'Use your mobile number and password.':'Register with your name, mobile number and password.'}</Text>
  <View style={styles.formCard}>
   {screen==='register'&&<><Text style={styles.label}>Full name</Text><TextInput style={styles.field} placeholder="Your name" value={name} onChangeText={setName}/></>}
   <Text style={styles.label}>Mobile number</Text><TextInput style={styles.field} keyboardType="phone-pad" placeholder="01XXXXXXXXX" maxLength={11} value={phone} onChangeText={setPhone}/>
   <Text style={styles.label}>Password</Text><TextInput style={styles.field} secureTextEntry placeholder={screen==='register'?'At least 10 characters':'Your password'} value={password} onChangeText={setPassword}/>
   {!!error&&<Text style={styles.error}>{error}</Text>}
   <Pill label={busy?'Signing in…':screen==='login'?'Log in':'Register'} onPress={screen==='login'?()=>void login():register}/>
  </View>
  <Pressable onPress={()=>go(screen==='login'?'register':'login')}><Text style={styles.switch}>{screen==='login'?'New to AdPanda? Register':'Already have an account? Log in'}</Text></Pressable>
  <Pressable onPress={guest}><Text style={styles.guestText}>Continue as Guest  →</Text></Pressable>
 </ScrollView>:
 <><ScrollView style={styles.scroll} contentContainerStyle={styles.landing}>
  {tab==='Home'?<>
   <View style={styles.hero}><Text style={styles.eyebrow}>● FRESH FROM YOUR NEIGHBOURHOOD</Text><Text style={styles.bigTitle}>Food, groceries & essentials. Delivered to your door.</Text><Text style={styles.paragraph}>Order from trusted local shops in Alamdanga.</Text><View style={styles.heroFood}><Text style={{fontSize:65}}>🍔</Text><Text style={{fontSize:40}}>🍟</Text><Text style={{fontSize:46}}>🥟</Text></View>
   <Pill label="Explore local shops  →" onPress={()=>browse()}/></View>
   <View style={styles.features}><Text style={styles.feature}>📍  Discover nearby</Text><Text style={styles.feature}>🍴  Freshly prepared</Text><Text style={styles.feature}>💗  Cash on delivery</Text></View>
   <Text style={styles.eyebrow}>WHAT DO YOU NEED TODAY?</Text><Text style={styles.sectionTitle}>Shop food, groceries & stationery</Text>
   {([['🍲','Food & Restaurants','Fresh meals from local kitchens'],['🛒','Grocery','Daily essentials at your doorstep'],['📚','Stationery','School and office supplies']] as const).map(([emoji,title,sub])=><Pressable onPress={()=>browse(title==='Food & Restaurants'?'FOOD':title==='Grocery'?'GROCERY':'STATIONERY')} key={title} style={styles.category}><Text style={styles.categoryEmoji}>{emoji}</Text><View style={{flex:1}}><Text style={styles.categoryTitle}>{title}</Text><Text style={styles.categorySub}>{sub}</Text></View><Text style={styles.pink}>›</Text></Pressable>)}
  </>:tab==='Explore'?<View style={styles.exploreArea}><Text style={styles.eyebrow}>EXPLORE ADPANDA</Text><Text style={styles.exploreTitle}>Discover local shops</Text><Text style={styles.paragraph}>Food, groceries and stationery around Alamdanga.</Text><View style={styles.filterRow}>{(['ALL','FOOD','GROCERY','STATIONERY'] as StoreType[]).map(type=><Pressable key={type} onPress={()=>setStoreType(type)} style={[styles.filterPill,storeType===type&&styles.filterSelected]}><Text style={[styles.filterLabel,storeType===type&&styles.filterSelectedLabel]}>{type==='ALL'?'All':type==='FOOD'?'Food':type==='GROCERY'?'Grocery':'Stationery'}</Text></Pressable>)}</View>
 {loadingStores&&<ActivityIndicator color="#E91672" style={{marginTop:25}}/>}
 {!!storeError&&<View style={styles.messageCard}><Text style={styles.error}>{storeError}</Text><Pill label="Try again" onPress={()=>setRefreshTick(n=>n+1)}/></View>}
 {!loadingStores&&!storeError&&stores.filter(store=>storeType==='ALL'||store.storeType===storeType).map(store=><Pressable key={store.id} style={styles.shopCard} onPress={()=>openStore(store.slug)}><View style={styles.shopIcon}><Text style={{fontSize:29}}>{store.storeType==='FOOD'?'🍔':store.storeType==='GROCERY'?'🛒':'📚'}</Text></View><View style={{flex:1}}><Text style={styles.shopTitle}>{store.name}</Text><Text numberOfLines={2} style={styles.shopDescription}>{store.description||'Local AdPanda shop'}</Text><Text style={styles.shopMeta}>{store.categories.reduce((total,c)=>total+c.items.filter(i=>i.available).length,0)} available items · {store.acceptingOrders?'🟢 Open':'🔴 Closed'}</Text></View><Text style={styles.pink}>›</Text></Pressable>)}
 {!loadingStores&&!storeError&&!stores.some(store=>storeType==='ALL'||store.storeType===storeType)&&<View style={styles.messageCard}><Text style={styles.paragraph}>No approved shops in this category yet.</Text></View>}
 <Text style={styles.smallInfo}>Shop details and checkout currently open on adpanda.food. Native cart and ordering are next.</Text></View>:tab==='Orders'?<><Text style={styles.sectionTitle}>Your orders</Text><Text style={styles.paragraph}>Order history and tracking will be connected in the next development phase.</Text>{!token&&<Pill label="Log in to view orders" onPress={()=>go('login')}/>}</>:<><Text style={styles.sectionTitle}>{token?'My account':'Guest account'}</Text><Text style={styles.paragraph}>{token?'Signed in as '+account:'You are exploring as a guest.'}</Text>{token?<Pill label="Log out" outline onPress={()=>void logout()}/>:<><Pill label="Log in" onPress={()=>go('login')}/><Pill label="Create account" outline onPress={()=>go('register')}/></>}</>}
 </ScrollView><View style={styles.bottomNav}>{(['Home','Explore','Orders','Account'] as Tab[]).map((item,index)=><Pressable onPress={()=>setTab(item)} key={item} style={[styles.navItem,tab===item&&styles.navActive]}><Text style={[styles.navIcon,tab===item&&styles.pink]}>{['⌂','▣','▢','♙'][index]}</Text><Text style={[styles.navText,tab===item&&styles.pink]}>{item}</Text></Pressable>)}</View></>}
 </SafeAreaView></SafeAreaProvider>;
}
const styles=StyleSheet.create({
 safe:{flex:1,backgroundColor:'#fff'},center:{flex:1,justifyContent:'center'},header:{paddingHorizontal:20,paddingTop:14,paddingBottom:14,borderBottomWidth:1,borderColor:'#F2F2F5',flexDirection:'row',alignItems:'center',justifyContent:'space-between'},logo:{fontWeight:'900',fontSize:25,color:'#252038'},pink:{color:'#E91672'},headerLabel:{fontSize:9,fontWeight:'800',color:'#848393',maxWidth:150,textAlign:'right'},
 scroll:{flex:1,backgroundColor:'#FCFBFD'},welcome:{flexGrow:1,paddingHorizontal:25,paddingTop:29,paddingBottom:36},heroOrbs:{height:185,backgroundColor:'#FFEAF3',borderRadius:110,alignSelf:'center',width:225,alignItems:'center',justifyContent:'center',marginBottom:28,position:'relative'},heroEmoji:{fontSize:95},heroAccent:{position:'absolute',fontSize:42,bottom:7,left:5},heroDrink:{position:'absolute',fontSize:44,top:0,right:-8},eyebrow:{fontSize:10,letterSpacing:1.45,fontWeight:'900',color:'#E91672',marginBottom:12},bigTitle:{fontSize:33,lineHeight:39,fontWeight:'900',color:'#252035',letterSpacing:-.7},paragraph:{color:'#77778D',fontSize:14,lineHeight:22,marginTop:13},welcomeButtons:{marginTop:30,gap:11},button:{backgroundColor:'#E91672',paddingVertical:15,paddingHorizontal:16,alignItems:'center',justifyContent:'center',borderRadius:11,marginTop:5},buttonOutline:{borderWidth:1.5,borderColor:'#E91672',backgroundColor:'#fff'},buttonText:{fontWeight:'800',fontSize:15,color:'#fff'},outlineText:{color:'#E91672'},guest:{padding:12,alignItems:'center',marginTop:4},guestText:{color:'#E91672',fontSize:15,fontWeight:'800',textAlign:'center',marginTop:16},smallInfo:{fontSize:11,color:'#9190A0',textAlign:'center',marginTop:24,lineHeight:18},
 formScreen:{flexGrow:1,padding:24,paddingTop:24,backgroundColor:'#F9F9FC'},back:{color:'#E91672',fontSize:16,fontWeight:'750',marginBottom:30},formTitle:{fontSize:29,fontWeight:'900',color:'#272139'},formCard:{borderWidth:1,borderColor:'#ECEAF0',backgroundColor:'#fff',borderRadius:16,padding:17,marginTop:24},label:{fontSize:12,color:'#333047',fontWeight:'800',marginTop:14,marginBottom:7},field:{borderWidth:1,borderColor:'#E4E3EC',borderRadius:10,paddingHorizontal:13,paddingVertical:12,fontSize:15,color:'#242037'},error:{color:'#BA1B44',fontSize:12,marginTop:12},switch:{color:'#E91672',fontWeight:'750',textAlign:'center',marginTop:22},
 landing:{paddingBottom:30},hero:{backgroundColor:'#FFF1F6',padding:24,paddingTop:30},heroFood:{flexDirection:'row',justifyContent:'space-around',alignItems:'center',height:150,marginTop:14,backgroundColor:'#FFD4E5',borderRadius:80},features:{marginHorizontal:18,marginTop:-1,borderRadius:18,padding:15,backgroundColor:'#fff',borderWidth:1,borderColor:'#EEEAF0',gap:13,marginBottom:30},feature:{fontWeight:'750',color:'#363045',fontSize:13},sectionTitle:{fontWeight:'900',fontSize:23,color:'#242035',marginHorizontal:20,marginBottom:18},category:{marginHorizontal:18,marginBottom:12,padding:16,borderRadius:15,backgroundColor:'#FFF0F6',flexDirection:'row',alignItems:'center',gap:13},categoryEmoji:{fontSize:33},categoryTitle:{fontWeight:'850',color:'#252139',fontSize:15},categorySub:{fontSize:11,color:'#868295',marginTop:4},
 exploreArea:{paddingHorizontal:18,paddingTop:24,paddingBottom:30},exploreTitle:{fontSize:27,fontWeight:'900',color:'#252035'},filterRow:{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:20,marginBottom:15},filterPill:{borderWidth:1,borderColor:'#F0DFE9',backgroundColor:'#fff',paddingHorizontal:13,paddingVertical:10,borderRadius:20},filterSelected:{backgroundColor:'#E91672',borderColor:'#E91672'},filterLabel:{fontSize:12,fontWeight:'750',color:'#595467'},filterSelectedLabel:{color:'#fff'},shopCard:{backgroundColor:'#fff',borderWidth:1,borderColor:'#EAE8F0',borderRadius:14,padding:13,marginTop:11,flexDirection:'row',alignItems:'center',gap:12},shopIcon:{width:57,height:57,borderRadius:12,backgroundColor:'#FFF0F6',justifyContent:'center',alignItems:'center'},shopTitle:{fontWeight:'850',fontSize:16,color:'#262238'},shopDescription:{fontSize:12,color:'#777689',marginTop:4},shopMeta:{fontSize:11,color:'#6E7688',marginTop:6},messageCard:{borderRadius:13,backgroundColor:'#FFF5F9',padding:18,marginTop:14},
 bottomNav:{flexDirection:'row',borderTopWidth:1,borderColor:'#EBE9F0',backgroundColor:'#fff',paddingHorizontal:8,paddingTop:7,paddingBottom:5},navItem:{flex:1,alignItems:'center',justifyContent:'center',paddingVertical:7,borderRadius:12},navActive:{backgroundColor:'#FFF0F6'},navIcon:{fontSize:23,color:'#8B8C9C'},navText:{fontSize:10,fontWeight:'800',color:'#858597',marginTop:2}
});
