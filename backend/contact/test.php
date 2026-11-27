<?php
declare(strict_types=1);
require __DIR__.'/core.php';
use CreAid\Contact\Rejection;
use function CreAid\Contact\handle;
$dir=sys_get_temp_dir().'/creaid-contact-'.bin2hex(random_bytes(8));mkdir($dir,0700);
$c=require __DIR__.'/config.example.php';$c['enabled']=true;$c['smtp_password']='TEST-ONLY';$c['rate_secret']=str_repeat('a',64);
$s=['REQUEST_METHOD'=>'POST','HTTP_ORIGIN'=>'https://vorschau.creaid-media.de','CONTENT_TYPE'=>'application/json','REMOTE_ADDR'=>'192.0.2.1'];
$d=['name'=>'Test Ä','email'=>'test@example.invalid','company'=>'','phone'=>'','service'=>'Webdesign & Entwicklung','message'=>"Test\nZeile",'website'=>''];
$sent=0;$send=function($data,$config)use(&$sent){$sent++;if($data['name']!=='Test Ä')throw new RuntimeException('wrong name');return true;};
$call=fn($s,$d,$c,$send,$now=1000)=>handle($s,json_encode($d,JSON_THROW_ON_ERROR),$c,$dir.'/rate.json',$send,$now);
function expect($status,$fn){try{$fn();}catch(Rejection $e){if($e->status===$status)return;throw $e;}throw new RuntimeException("Expected $status");}
try{
 expect(405,fn()=>$call(array_replace($s,['REQUEST_METHOD'=>'GET']),$d,$c,$send));
 expect(403,fn()=>$call(array_replace($s,['HTTP_ORIGIN'=>'https://example.invalid']),$d,$c,$send));
 expect(415,fn()=>$call(array_replace($s,['CONTENT_TYPE'=>'text/plain']),$d,$c,$send));
 expect(503,fn()=>$call($s,$d,array_replace($c,['enabled'=>false]),$send));
 expect(413,fn()=>handle($s,str_repeat('x',16385),$c,$dir.'/rate.json',$send,1000));
 expect(422,fn()=>$call($s,array_replace($d,['email'=>"x@example.invalid\nBcc:spam@example.invalid"]),$c,$send));
 expect(422,fn()=>$call($s,array_replace($d,['website'=>'bot']),$c,$send));
 expect(422,fn()=>$call($s,array_replace($d,['service'=>'Unknown']),$c,$send));
 expect(429,fn()=>$call($s,$d,$c,$send));
 if($sent!==0)throw new RuntimeException('Invalid submissions reached mailer');
 $r=$call($s,$d,$c,$send,1601);if($r!==['ok'=>true,'status'=>'accepted']||$sent!==1)throw new RuntimeException('Valid submit');
 $retryServer=array_replace($s,['REMOTE_ADDR'=>'192.0.2.2']);
 $retryData=array_replace($d,['email'=>'TEST@example.invalid','message'=>"Test\r\nZeile"]);
 $retry=$call($retryServer,$retryData,$c,$send,1602);
 if($retry!==['ok'=>true,'status'=>'accepted','duplicate'=>true]||$sent!==1)throw new RuntimeException('Retry repeated a delivery');
 $failedData=array_replace($d,['message'=>'Failed SMTP request']);
 expect(502,fn()=>$call($s,$failedData,$c,fn()=>false,1601));
 expect(502,fn()=>$call($s,$failedData,$c,function(){throw new RuntimeException('private detail');},1601));
 expect(429,fn()=>$call($s,$d,$c,$send,1601));
 $concurrentServer=array_replace($s,['REMOTE_ADDR'=>'192.0.2.3']);
 $delivery=function($data,$config)use($call,$concurrentServer,$send){
   expect(409,fn()=>$call($concurrentServer,$data,$config,$send,1604));
   return $send($data,$config);
 };
 $r=$call($retryServer,$failedData,$c,$delivery,1603);
 if(!$r['ok']||$sent!==2)throw new RuntimeException('Retry after failure or concurrent prevention');
 $r=$call(array_replace($s,['HTTP_ORIGIN'=>'https://creaid-media.de']),$d,array_replace($c,['allowed_origins'=>['https://creaid-media.de']]),$send,2202);
 if(!$r['ok']||$sent!==3)throw new RuntimeException('Domain migration or receipt expiry');
 echo "PASS: validation, rate limit, SMTP failures, overlapping delivery, duplicate receipt and expiry; no real email sent.\n";
}finally{foreach(glob($dir.'/*') as $file)unlink($file);rmdir($dir);}
