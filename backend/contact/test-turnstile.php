<?php
declare(strict_types=1);
require __DIR__.'/core.php';
require __DIR__.'/turnstile.php';
use CreAid\Contact\Rejection;
use function CreAid\Contact\verifyTurnstile;
use function CreAid\Contact\handle;
function expectReject(int $status,string $reason,callable $fn):void{
 try{$fn();}catch(Rejection $e){if($e->status===$status&&$e->reason===$reason)return;throw $e;}
 throw new RuntimeException('Expected rejection: '.$reason);
}
$c=require __DIR__.'/config.example.php';
$c=array_replace($c,['enabled'=>true,'smtp_password'=>'test','rate_secret'=>str_repeat('a',64),'turnstile_required'=>true,'turnstile_secret'=>'test-secret']);
$ok=['success'=>true,'hostname'=>'vorschau.creaid-media.de','action'=>'contact'];
$transport=fn($params)=>$ok;
verifyTurnstile('valid-token',$c,$transport);
expectReject(422,'captcha_required',fn()=>verifyTurnstile('',$c,$transport));
expectReject(422,'captcha_required',fn()=>verifyTurnstile(str_repeat('x',2049),$c,$transport));
expectReject(422,'captcha_invalid',fn()=>verifyTurnstile('fake',$c,fn()=>['success'=>false]));
expectReject(422,'captcha_invalid',fn()=>verifyTurnstile('duplicate',$c,fn()=>['success'=>false,'error-codes'=>['timeout-or-duplicate']]));
expectReject(422,'captcha_invalid',fn()=>verifyTurnstile('fake',$c,fn()=>array_replace($ok,['hostname'=>'other.example'])));
expectReject(422,'captcha_invalid',fn()=>verifyTurnstile('fake',$c,fn()=>array_replace($ok,['action'=>'other'])));
expectReject(503,'captcha_unavailable',fn()=>verifyTurnstile('valid',$c,fn()=>['success'=>false,'error-codes'=>['internal-error']]));
expectReject(503,'captcha_unavailable',fn()=>verifyTurnstile('valid',array_replace($c,['turnstile_secret'=>'']),$transport));
$s=['REQUEST_METHOD'=>'POST','HTTP_ORIGIN'=>'https://vorschau.creaid-media.de','CONTENT_TYPE'=>'application/json','REMOTE_ADDR'=>'192.0.2.10'];
$d=['name'=>'Test','email'=>'test@example.invalid','service'=>'Allgemeine Projektanfrage','message'=>'Test','website'=>''];
$file=tempnam(sys_get_temp_dir(),'creaid-rate-');$sent=0;
$send=function($data)use(&$sent){if(isset($data['turnstile_token']))throw new RuntimeException('Token leaked into mail');$sent++;return true;};
$v=fn($token,$cfg)=>verifyTurnstile($token,$cfg,$transport);
try{
 expectReject(422,'captcha_required',fn()=>handle($s,json_encode($d),$c,$file,$send,1000,$v));
 expectReject(503,'captcha_unavailable',fn()=>handle($s,json_encode($d+['turnstile_token'=>'valid']),$c,$file,$send,1000));
 if($sent!==0)throw new RuntimeException('Invalid challenge reached mailer');
 $r=handle($s,json_encode($d+['turnstile_token'=>'valid']),$c,$file,$send,1000,$v);
 if(!$r['ok']||$sent!==1)throw new RuntimeException('Valid challenge not accepted');
 echo "TURNSTILE_QA_OK: missing, forged, expired/replayed, hostname/action mismatch, upstream errors and fail-closed mailer checked; no real network or mail.\n";
}finally{foreach(glob($file.'*') as $testFile)unlink($testFile);}
