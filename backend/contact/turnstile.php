<?php
declare(strict_types=1);
namespace CreAid\Contact;
const TURNSTILE_VERIFY_URL='https://challenges.cloudflare.com/turnstile/v0/siteverify';
function turnstileRequest(array $params): array {
    $ctx=stream_context_create(['http'=>[
        'method'=>'POST','header'=>"Content-Type: application/x-www-form-urlencoded\r\nAccept: application/json\r\n",
        'content'=>http_build_query($params,'','&',PHP_QUERY_RFC3986),'timeout'=>8,'follow_location'=>0,
        'ignore_errors'=>true
    ],'ssl'=>['verify_peer'=>true,'verify_peer_name'=>true]]);
    $raw=@file_get_contents(TURNSTILE_VERIFY_URL,false,$ctx,0,16384);
    if($raw===false)throw new Rejection(503,'captcha_unavailable');
    try{$data=json_decode($raw,true,16,JSON_THROW_ON_ERROR);}catch(\JsonException){throw new Rejection(503,'captcha_unavailable');}
    if(!is_array($data))throw new Rejection(503,'captcha_unavailable');
    return $data;
}
function verifyTurnstile(string $token,array $config,?callable $transport=null): void {
    $secret=$config['turnstile_secret']??'';
    $host=$config['turnstile_hostname']??'';
    if(!is_string($secret)||$secret===''||!is_string($host)||$host==='')throw new Rejection(503,'captcha_unavailable');
    if(strlen($token)<1||strlen($token)>2048||preg_match('/[\x00-\x20\x7f]/',$token))throw new Rejection(422,'captcha_required');
    $response=($transport??__NAMESPACE__.'\\turnstileRequest')(['secret'=>$secret,'response'=>$token]);
    if(($response['success']??false)!==true){
        $codes=$response['error-codes']??[];
        if(is_array($codes)&&array_intersect($codes,['missing-input-secret','invalid-input-secret','internal-error']))throw new Rejection(503,'captcha_unavailable');
        throw new Rejection(422,'captcha_invalid');
    }
    if(($response['hostname']??null)!==$host||($response['action']??null)!=='contact')throw new Rejection(422,'captcha_invalid');
}
