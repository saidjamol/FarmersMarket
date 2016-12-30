from django.shortcuts import render, redirect
# from django.views.decorators.csrf import csrf_exempt, csrf_protect, ensure_csrf_cookie

# Create your views here.

def index(request):
        return redirect('/main')

def show_fMarket(request):
    return render(request, 'farmers/index.html')

def localdata(request):
    return render(request, 'farmers/markets.json')

# @csrf_exempt # decorator to exempt route from CSRF checking. Not secure so don't use with sensitive data or routes that can have side effects.
def js2py(request):
    if request.method != "POST":
        return redirect("/main")
    global market # declare market a global variable
    market = dict(request.POST.dict()) # changes querydict from POST response to dict. key names will change, for example, FMID becomes market[FMID]. Here [FMID] is just part of the string the is the key name, not array index. Also, django will automatically take out the csrftoken part of the passed data.
    return redirect("/marketwall")

def marketwall(request):
    context = {"marketData": market}
    return render(request, "farmers/marketwall.html", context)
